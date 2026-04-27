"""
ResumeAnalyzer — top-level orchestrator.

Build ONE instance per process and reuse it. spaCy and the
sentence-transformer model load once on construction.

Typical Firebase Functions usage:
    from resume_analyzer import ResumeAnalyzer
    _ANALYZER = ResumeAnalyzer()    # at module load
    result = _ANALYZER.analyze(resume_text=..., jd_text=...)
"""

from __future__ import annotations

import logging
from typing import Dict, Optional

from .ats_scorer import ATSScorer
from .jd_analyzer import JobDescriptionAnalyzer
from .keyword_matcher import KeywordMatcher
from .parser import ResumeParser
from .suggestion_engine import SuggestionEngine

logger = logging.getLogger(__name__)


class ResumeAnalyzer:
    """High-level entry point. Reuse the same instance across requests."""

    def __init__(self, load_semantic_model: bool = True) -> None:
        self.parser = ResumeParser()
        self._spacy_nlp = self._load_spacy()
        self._sentence_model = (
            self._load_sentence_model() if load_semantic_model else None
        )
        self.jd_analyzer = JobDescriptionAnalyzer(nlp=self._spacy_nlp)
        self.matcher = KeywordMatcher(sentence_model=self._sentence_model)
        self.scorer = ATSScorer()
        self.suggestor = SuggestionEngine()

    @staticmethod
    def _load_spacy():
        try:
            import spacy
            try:
                return spacy.load(
                    "en_core_web_sm",
                    disable=["parser"],
                )
            except OSError:
                # Auto-download on first run (Streamlit Cloud / cold start)
                import subprocess, sys
                logger.info("Downloading en_core_web_sm...")
                subprocess.run(
                    [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
                    check=True, capture_output=True,
                )
                return spacy.load("en_core_web_sm", disable=["parser"])
        except Exception:
            logger.info("spaCy unavailable; using blank pipeline.")
            try:
                import spacy
                return spacy.blank("en")
            except ImportError:
                return None

    @staticmethod
    def _load_sentence_model():
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2"
            )
        except Exception as exc:  # noqa: BLE001
            logger.info(
                "sentence-transformers unavailable (%s) — TF-IDF only.",
                exc,
            )
            return None

    # ------------------------------------------------------------------

    def analyze(
        self,
        jd_text: str,
        resume_path: Optional[str] = None,
        resume_text: Optional[str] = None,
        resume_bytes: Optional[bytes] = None,
        resume_extension: Optional[str] = None,
    ) -> Dict:
        """
        Analyze a resume against a JD. Provide ONE of:
          - resume_path: path to file on disk
          - resume_text: raw text string
          - resume_bytes + resume_extension: bytes + ".pdf" / ".docx" / ".txt"
        """
        if (resume_text is None and resume_path is None
                and resume_bytes is None):
            raise ValueError(
                "Provide one of resume_text, resume_path, or "
                "resume_bytes (with resume_extension)."
            )

        if resume_text is None:
            if resume_bytes is not None:
                if not resume_extension:
                    raise ValueError(
                        "resume_extension required with resume_bytes"
                    )
                resume_text = self.parser.parse_from_bytes(
                    resume_bytes, resume_extension
                )
            else:
                resume_text = self.parser.parse(resume_path)

        if not resume_text or not resume_text.strip():
            return self._empty_result(
                "Could not extract any text from the resume. "
                "If it's a scanned/image-based PDF, OCR is required first."
            )
        if not jd_text or not jd_text.strip():
            return self._empty_result("Job description is empty.")

        # 1. Analyze JD
        jd_info = self.jd_analyzer.analyze(jd_text)
        jd_skills = jd_info["all_skills"]
        skill_weights = jd_info["skill_weights"]

        # 2. Match
        match_result = self.matcher.match(
            resume_text=resume_text,
            jd_skills=jd_skills,
            jd_text=jd_text,
            skill_weights=skill_weights,
        )

        # 3. Score
        layout_flags = self.parser.detect_layout_issues(resume_path)
        score_result = self.scorer.score(
            resume_text=resume_text,
            jd_skills=jd_skills,
            match_result=match_result,
            layout_flags=layout_flags,
            jd_min_yoe=jd_info.get("min_years_experience"),
            jd_required_degrees=jd_info.get("required_degrees"),
        )

        # 4. Suggest
        suggestions = self.suggestor.generate(
            match_result=match_result,
            score_result=score_result,
            jd_skill_weights=skill_weights,
            jd_required_skills=jd_info.get("required_skills", []),
            jd_preferred_skills=jd_info.get("preferred_skills", []),
        )

        return {
            "ats_score": score_result["ats_score"],
            "score_breakdown": score_result["score_breakdown"],
            "raw_scores": score_result["raw_scores"],
            "weights": score_result["weights"],
            "matched_keywords": match_result["matched"],
            "missing_keywords": match_result["missing"],
            "partial_matches": [
                {"skill": s, "evidence": e}
                for s, e in match_result["partial"]
            ],
            "section_analysis": score_result["section_analysis"],
            "formatting_issues": score_result["formatting_issues"],
            "achievement_stats": score_result["achievement_stats"],
            "experience_check": score_result["experience_check"],
            "education_check": score_result["education_check"],
            "jd_required_skills": jd_info.get("required_skills", []),
            "jd_preferred_skills": jd_info.get("preferred_skills", []),
            "jd_top_keywords": jd_info["top_keywords"],
            "similarity": {
                "tfidf": round(match_result["tfidf_similarity"], 4),
                "semantic": (
                    round(match_result["semantic_similarity"], 4)
                    if match_result["semantic_similarity"] is not None
                    else None
                ),
            },
            "suggestions": suggestions,
            "meta": {
                "resume_word_count": len(resume_text.split()),
                "jd_word_count": len(jd_text.split()),
                "jd_skills_total": len(jd_skills),
                "jd_skills_hard_count": len(jd_info["hard_skills"]),
                "jd_skills_soft_count": len(jd_info["soft_skills"]),
                "semantic_model_loaded": self._sentence_model is not None,
                "spacy_loaded": (
                    self._spacy_nlp is not None
                    and getattr(self._spacy_nlp, "lang", None) is not None
                ),
            },
        }

    @staticmethod
    def _empty_result(message: str) -> Dict:
        return {
            "ats_score": 0.0,
            "score_breakdown": {
                "keyword_match": 0.0, "hard_skills": 0.0,
                "sections": 0.0, "formatting": 0.0,
                "achievements": 0.0,
            },
            "raw_scores": {}, "weights": {},
            "matched_keywords": [], "missing_keywords": [],
            "partial_matches": [], "section_analysis": {},
            "formatting_issues": [], "achievement_stats": {},
            "experience_check": {}, "education_check": {},
            "jd_required_skills": [], "jd_preferred_skills": [],
            "jd_top_keywords": [],
            "similarity": {"tfidf": 0.0, "semantic": None},
            "suggestions": [{
                "priority": "high", "category": "input",
                "title": "Input problem", "message": message, "items": [],
            }],
            "meta": {"error": message},
        }

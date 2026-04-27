"""
ATSScorer: 0–100 ATS readiness score from sub-scores.

Weights (sum to 1.0 — edit to tune):
  keyword_match : 0.40   blended TF-IDF + semantic + weighted recall
  hard_skills   : 0.25   recall over hard/technical JD skills
  sections      : 0.15   presence of standard resume sections
  formatting    : 0.10   ATS-unfriendly formatting penalties
  achievements  : 0.10   action verbs + quantifiable metrics

Education and years-of-experience matching are surfaced as separate
diagnostic fields and feed warnings into the suggestion engine — they
don't directly add to the score because some roles are flexible on those.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Set, Tuple

from .skills_taxonomy import get_hard_skills

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# TUNABLE WEIGHTS - must sum to 1.0
# ---------------------------------------------------------------------------
WEIGHTS: Dict[str, float] = {
    "keyword_match": 0.40,
    "hard_skills":   0.25,
    "sections":      0.15,
    "formatting":    0.10,
    "achievements":  0.10,
}


# Resume sections — variant headings we look for
SECTION_KEYWORDS: Dict[str, List[str]] = {
    "contact": [
        "email", "@", "phone", "mobile", "linkedin", "github",
        "address", "location", "portfolio",
    ],
    "summary": [
        "summary", "professional summary", "profile",
        "objective", "career objective", "about me", "about",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment history", "work history", "career history",
        "professional background",
    ],
    "education": [
        "education", "academic", "qualifications", "academic background",
        "educational background",
    ],
    "skills": [
        "skills", "technical skills", "core competencies", "expertise",
        "technologies", "tech stack", "competencies",
    ],
    "projects": [
        "projects", "key projects", "personal projects",
        "academic projects", "selected projects",
    ],
}


ACTION_VERBS: Set[str] = {
    "achieved", "improved", "trained", "managed", "created", "resolved",
    "volunteered", "influenced", "increased", "decreased", "researched",
    "authored", "developed", "designed", "implemented", "led", "launched",
    "delivered", "built", "engineered", "architected", "automated",
    "optimized", "reduced", "negotiated", "presented", "spearheaded",
    "coordinated", "executed", "established", "founded", "generated",
    "initiated", "mentored", "modernized", "orchestrated", "owned",
    "pioneered", "produced", "promoted", "published", "redesigned",
    "refactored", "scaled", "shipped", "streamlined", "transformed",
    "supervised", "expanded", "analyzed", "directed", "headed",
    "accelerated", "consolidated", "drove", "enhanced", "facilitated",
    "secured", "saved", "boosted", "championed",
}

ATS_UNFRIENDLY_HINTS: List[str] = [
    "image:", "figure:", "[image]", "[figure]", "[icon]",
]


class ATSScorer:
    """Combine sub-scores into a single 0-100 ATS-readiness score."""

    def score(
        self,
        resume_text: str,
        jd_skills: List[str],
        match_result: Dict,
        layout_flags: Dict,
        jd_min_yoe: Optional[int] = None,
        jd_required_degrees: Optional[List[str]] = None,
    ) -> Dict:
        # Sub-scores (0..1)
        km = self._score_keyword_match(match_result)
        hs = self._score_hard_skills(
            match_result.get("matched", []), jd_skills
        )
        section_present, sec = self._score_sections(resume_text)
        format_issues, fmt = self._score_formatting(resume_text, layout_flags)
        ach_stats, ach = self._score_achievements(resume_text)

        raw = {"keyword_match": km, "hard_skills": hs, "sections": sec,
               "formatting": fmt, "achievements": ach}
        breakdown = {
            d: round(raw[d] * WEIGHTS[d] * 100, 2) for d in WEIGHTS
        }
        ats_score = round(sum(breakdown.values()), 2)

        # Diagnostic checks (non-scoring)
        yoe = self._extract_resume_yoe(resume_text)
        degrees = self._extract_resume_degrees(resume_text)
        yoe_match = (
            None if jd_min_yoe is None
            else (yoe is not None and yoe >= jd_min_yoe)
        )
        degree_match = (
            None if not jd_required_degrees
            else self._degree_match(degrees, jd_required_degrees)
        )

        return {
            "ats_score": ats_score,
            "score_breakdown": breakdown,
            "raw_scores": {k: round(v, 4) for k, v in raw.items()},
            "section_analysis": section_present,
            "formatting_issues": format_issues,
            "achievement_stats": ach_stats,
            "weights": dict(WEIGHTS),
            "experience_check": {
                "jd_min_years": jd_min_yoe,
                "resume_years_detected": yoe,
                "meets_requirement": yoe_match,
            },
            "education_check": {
                "jd_required_degrees": jd_required_degrees or [],
                "resume_degrees": degrees,
                "meets_requirement": degree_match,
            },
        }

    # ------------------------------------------------------------------
    # Sub-scorers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_keyword_match(mr: Dict) -> float:
        tfidf = mr.get("tfidf_similarity") or 0.0
        recall = mr.get("weighted_match_ratio") or 0.0
        sem = mr.get("semantic_similarity")
        if sem is not None:
            # Recall is the most direct signal; semantic captures meaning
            # alignment; TF-IDF captures lexical overlap.
            return 0.55 * recall + 0.20 * tfidf + 0.25 * sem
        return 0.70 * recall + 0.30 * tfidf

    @staticmethod
    def _score_hard_skills(matched: List[str], jd_skills: List[str]) -> float:
        hard = get_hard_skills()
        jd_hard = [s for s in jd_skills if s in hard]
        if not jd_hard:
            return 1.0  # JD has no hard skills - don't penalize
        matched_hard = [s for s in matched if s in hard]
        return len(matched_hard) / len(jd_hard)

    @staticmethod
    def _score_sections(text: str) -> Tuple[Dict[str, bool], float]:
        text_lower = (text or "").lower()
        present: Dict[str, bool] = {}
        for sec, variants in SECTION_KEYWORDS.items():
            present[sec] = any(v in text_lower for v in variants)
        score = sum(1 for v in present.values() if v) / len(SECTION_KEYWORDS)
        return present, score

    @staticmethod
    def _score_formatting(
        text: str, layout: Dict
    ) -> Tuple[List[str], float]:
        issues: List[str] = []
        score = 1.0
        text = text or ""
        wc = len(text.split())

        if layout.get("has_tables"):
            issues.append(
                "Tables detected — many ATS systems mangle table text. "
                "Convert to single-column layout."
            )
            score -= 0.30

        if layout.get("has_multiple_columns"):
            issues.append(
                "Multi-column layout detected — ATS often reads columns "
                "in the wrong order. Use a single-column layout."
            )
            score -= 0.20

        for hint in ATS_UNFRIENDLY_HINTS:
            if hint.lower() in text.lower():
                issues.append(
                    f"Layout marker '{hint}' detected — likely an image "
                    "or figure that ATS won't read."
                )
                score -= 0.10
                break

        non_ascii = sum(1 for c in text if ord(c) > 127)
        if text and non_ascii / max(len(text), 1) > 0.05:
            issues.append(
                "High proportion of non-ASCII / special characters — "
                "may be decorative bullets/symbols ATS can't parse."
            )
            score -= 0.15

        if wc < 150:
            issues.append(
                f"Resume is very short ({wc} words). "
                "Aim for 300-800 words on a one-page resume."
            )
            score -= 0.20
        elif wc > 1500:
            issues.append(
                f"Resume is very long ({wc} words). "
                "Aim for under ~1000 words; ATS often truncates long docs."
            )
            score -= 0.15

        pc = layout.get("page_count", 0)
        if pc and pc > 3:
            issues.append(
                f"Resume is {pc} pages. Most ATS workflows favor 1-2 pages."
            )
            score -= 0.10

        return issues, max(0.0, min(score, 1.0))

    @staticmethod
    def _score_achievements(text: str) -> Tuple[Dict, float]:
        text = (text or "").lower()
        if not text.strip():
            return ({"action_verb_count": 0, "numeric_metrics": 0,
                     "verb_density": 0.0,
                     "quantification_score": 0.0,
                     "action_verbs": []},
                    0.0)
        verbs = {v for v in ACTION_VERBS if re.search(rf"\b{v}\b", text)}
        numeric_patterns = [
            r"\b\d+(?:\.\d+)?\s*%",
            r"[\$\u20ac\u00a3\u20b9]\s?\d",
            r"\b\d+(?:\.\d+)?\s?[kKmMbB]\b",
            r"\b\d{2,}\b",
            r"\b\d+x\b",
        ]
        nhits = sum(len(re.findall(p, text)) for p in numeric_patterns)
        verb_density = min(len(verbs) / 10.0, 1.0)
        quant = min(nhits / 8.0, 1.0)
        score = 0.5 * verb_density + 0.5 * quant
        stats = {
            "action_verbs": sorted(verbs),
            "action_verb_count": len(verbs),
            "numeric_metrics": nhits,
            "verb_density": round(verb_density, 3),
            "quantification_score": round(quant, 3),
        }
        return stats, score

    # ------------------------------------------------------------------
    # Diagnostic extraction (resume-side)
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_resume_yoe(text: str) -> Optional[int]:
        """Best-effort estimate of years of experience claimed in resume."""
        if not text:
            return None
        text_lower = text.lower()
        candidates = []
        for pat in [
            r"(\d+)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)",
            r"(\d+)\s*\+\s*(?:years?|yrs?)",
        ]:
            for m in re.finditer(pat, text_lower):
                try:
                    candidates.append(int(m.group(1)))
                except (ValueError, IndexError):
                    pass
        if candidates:
            return max(candidates)

        # Fallback: count distinct year ranges in the resume.
        # E.g. "2018 - 2024" -> 6 years.
        ranges = re.findall(
            r"\b(19\d{2}|20\d{2})\s*[-\u2013\u2014to]\s*"
            r"(19\d{2}|20\d{2}|present|current|now)\b",
            text_lower,
        )
        total = 0
        from datetime import datetime
        this_year = datetime.utcnow().year
        for start, end in ranges:
            try:
                s = int(start)
                e = this_year if not end.isdigit() else int(end)
                total += max(0, e - s)
            except ValueError:
                pass
        return total if total > 0 else None

    @staticmethod
    def _extract_resume_degrees(text: str) -> List[str]:
        if not text:
            return []
        text_lower = text.lower()
        found: Set[str] = set()
        patterns = [
            (r"\b(ph\.?d|doctorate|doctoral)\b", "PhD"),
            (r"\b(m\.?s\.?|master[''s]*|m\.?sc|m\.?b\.?a|mba|m\.?eng|m\.?tech)\b", "Master's"),
            (r"\b(b\.?s\.?|bachelor[''s]*|b\.?sc|b\.?e\.?|b\.?tech|bachelors?)\b", "Bachelor's"),
            (r"\b(associate[''s]*\s+degree|a\.?a\.?|a\.?s\.?)\b", "Associate's"),
        ]
        for pat, label in patterns:
            if re.search(pat, text_lower):
                found.add(label)
        return sorted(found)

    @staticmethod
    def _degree_match(
        resume_degrees: List[str], jd_required: List[str]
    ) -> bool:
        """A higher degree satisfies a lower one (Master >= Bachelor)."""
        order = ["Associate's", "Bachelor's", "Master's", "PhD"]
        if not jd_required:
            return True
        if not resume_degrees:
            return False
        max_resume = max(
            (order.index(d) for d in resume_degrees if d in order),
            default=-1,
        )
        max_required = max(
            (order.index(d) for d in jd_required if d in order),
            default=-1,
        )
        return max_resume >= max_required

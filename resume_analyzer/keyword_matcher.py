"""
KeywordMatcher: matches JD keywords against resume content.

Combines four matching strategies, in priority order:
  1) Exact / synonym match via SkillIndex (longest-match-first)
  2) Token subset match for multi-word skills (e.g. "Machine Learning"
     present if both "machine" and "learning" appear within 4 tokens)
  3) Fuzzy match — Levenshtein distance for typo tolerance
  4) Document-level signals: TF-IDF (1-2 grams) + sentence-transformer
     semantic similarity, both cosine

The four signals feed into the ATS scorer differently — see ats_scorer.py.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .skills_taxonomy import SKILL_INDEX

logger = logging.getLogger(__name__)


class KeywordMatcher:
    """Match JD keywords against a resume."""

    # Levenshtein distance threshold per skill length.
    # Single-word skills only — multi-word fuzzy matching is unreliable.
    @staticmethod
    def _max_typo_distance(word: str) -> int:
        n = len(word)
        if n <= 4:
            return 0           # short words: no fuzzy match (too risky)
        if n <= 7:
            return 1
        return 2

    def __init__(self, sentence_model=None) -> None:
        self._sentence_model = sentence_model
        self._sentence_attempted = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def match(
        self,
        resume_text: str,
        jd_skills: List[str],
        jd_text: str,
        skill_weights: Optional[Dict[str, float]] = None,
    ) -> Dict:
        skill_weights = skill_weights or {}
        resume_lower = (resume_text or "").lower()

        # Pre-find canonical skills present in the resume via SkillIndex.
        resume_skill_spans = SKILL_INDEX.find_skills(resume_text or "")
        resume_canonicals = {canon for canon, _ in resume_skill_spans}

        matched: List[str] = []
        missing: List[str] = []
        partial: List[Tuple[str, str]] = []

        for skill in jd_skills:
            if skill in resume_canonicals:
                matched.append(skill)
                continue

            # Token subset for multi-word skills
            tokens = [t for t in re.split(r"[\s/]+", skill.lower())
                      if len(t) > 2]
            if len(tokens) >= 2:
                if self._all_tokens_within_window(
                    tokens, resume_lower, window=8
                ):
                    partial.append((skill, " + ".join(tokens)))
                    continue

            # Fuzzy match for single-word skills
            if len(tokens) == 1:
                fuzzy = self._fuzzy_find(tokens[0], resume_lower)
                if fuzzy:
                    partial.append((skill, f"~{fuzzy}"))
                    continue

            missing.append(skill)

        # Weighted recall — how much of the JD's important skill mass
        # is actually covered.
        if skill_weights and jd_skills:
            total_w = sum(skill_weights.get(s, 1.0) for s in jd_skills)
            covered = sum(skill_weights.get(s, 1.0) for s in matched)
            partial_w = sum(skill_weights.get(s, 1.0) for s, _ in partial)
            recall = (covered + 0.5 * partial_w) / total_w if total_w > 0 else 0.0
        else:
            denom = max(len(jd_skills), 1)
            recall = (len(matched) + 0.5 * len(partial)) / denom

        return {
            "matched": matched,
            "missing": missing,
            "partial": partial,
            "tfidf_similarity": self._tfidf_similarity(
                resume_text, jd_text
            ),
            "semantic_similarity": self._semantic_similarity(
                resume_text, jd_text
            ),
            "weighted_match_ratio": recall,
        }

    # ------------------------------------------------------------------
    # Per-skill matching helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _all_tokens_within_window(
        tokens: List[str], text: str, window: int = 8
    ) -> bool:
        """
        Check if every token appears in the text *and* the spread of
        their first occurrences is within `window` tokens.
        """
        words = re.findall(r"[a-z0-9+#./\-]+", text)
        positions: Dict[str, int] = {}
        for i, w in enumerate(words):
            for tok in tokens:
                if tok not in positions and w == tok:
                    positions[tok] = i
        if len(positions) < len(tokens):
            return False
        spread = max(positions.values()) - min(positions.values())
        return spread <= window

    @classmethod
    def _fuzzy_find(cls, token: str, text: str) -> Optional[str]:
        """
        Find a near-match of `token` in `text`. Returns the matched
        word, or None.
        """
        max_dist = cls._max_typo_distance(token)
        if max_dist == 0:
            return None
        words = set(re.findall(r"[a-z]{4,}", text))  # alpha-only, len>=4
        for w in words:
            if abs(len(w) - len(token)) > max_dist:
                continue
            if cls._levenshtein(w, token) <= max_dist:
                return w
        return None

    @staticmethod
    def _levenshtein(a: str, b: str) -> int:
        # Iterative DP, O(min(m,n)) memory.
        if a == b:
            return 0
        if len(a) < len(b):
            a, b = b, a
        if not b:
            return len(a)
        prev = list(range(len(b) + 1))
        for i, ca in enumerate(a, start=1):
            cur = [i] + [0] * len(b)
            for j, cb in enumerate(b, start=1):
                cost = 0 if ca == cb else 1
                cur[j] = min(
                    cur[j - 1] + 1,         # insertion
                    prev[j] + 1,            # deletion
                    prev[j - 1] + cost,     # substitution
                )
            prev = cur
        return prev[-1]

    # ------------------------------------------------------------------
    # Document-level similarity
    # ------------------------------------------------------------------

    @staticmethod
    def _tfidf_similarity(resume_text: str, jd_text: str) -> float:
        if not resume_text or not jd_text:
            return 0.0
        if not resume_text.strip() or not jd_text.strip():
            return 0.0
        try:
            vec = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                max_features=8000,
                lowercase=True,
                sublinear_tf=True,
            )
            mat = vec.fit_transform([resume_text, jd_text])
            sim = cosine_similarity(mat[0:1], mat[1:2])[0][0]
            return float(max(0.0, min(sim, 1.0)))
        except Exception as exc:  # noqa: BLE001
            logger.warning("TF-IDF similarity failed: %s", exc)
            return 0.0

    def _semantic_similarity(
        self, resume_text: str, jd_text: str
    ) -> Optional[float]:
        if not resume_text or not jd_text:
            return None
        if not resume_text.strip() or not jd_text.strip():
            return None
        model = self._load_sentence_model()
        if model is None:
            return None
        try:
            import numpy as np
            emb = model.encode(
                [resume_text[:8000], jd_text[:8000]],
                convert_to_numpy=True, show_progress_bar=False,
            )
            num = float((emb[0] * emb[1]).sum())
            denom = float(
                (np.linalg.norm(emb[0]) * np.linalg.norm(emb[1])) or 1.0
            )
            return float(max(0.0, min(num / denom, 1.0)))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Semantic similarity failed: %s", exc)
            return None

    def _load_sentence_model(self):
        if self._sentence_model is not None:
            return self._sentence_model
        if self._sentence_attempted:
            return None
        self._sentence_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
            # Small CPU-friendly model. ~80 MB on disk.
            self._sentence_model = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2"
            )
            return self._sentence_model
        except Exception as exc:  # noqa: BLE001
            logger.info(
                "sentence-transformers unavailable (%s) — TF-IDF only.",
                exc,
            )
            return None

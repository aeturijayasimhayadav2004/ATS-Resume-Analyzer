"""
JobDescriptionAnalyzer — extract skills, requirements, education, and
years-of-experience from a job description with importance weights.

Key accuracy improvements vs naive keyword extraction:
  - section detection: requirements/responsibilities/nice-to-have are
    weighted differently
  - negation handling: "no Java required" must not add Java
  - context-aware: skills near "required" / "must" get a +bonus,
    skills near "preferred" / "nice to have" get a small penalty
  - phrase-aware via SkillIndex (longest-match-first)
  - years-of-experience pattern extraction
  - degree extraction (Bachelor, Master, PhD)
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Dict, List, Optional, Set, Tuple

from .skills_taxonomy import (
    SKILL_INDEX,
    get_hard_skills,
    get_soft_skills,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Section keywords - the JD usually has these block headings
# ---------------------------------------------------------------------------

REQUIRED_HEADERS = [
    "required", "requirements", "must have", "must-have", "what you need",
    "minimum qualifications", "basic qualifications",
    "required qualifications", "we expect", "you have", "you must",
    "essential", "mandatory",
]
NICE_TO_HAVE_HEADERS = [
    "nice to have", "nice-to-have", "preferred", "preferred qualifications",
    "bonus", "plus", "good to have", "desirable", "ideal candidate",
    "we appreciate", "added advantage", "would be a plus",
]
RESPONSIBILITY_HEADERS = [
    "responsibilities", "what you'll do", "what you will do",
    "your role", "the role", "duties", "key responsibilities",
    "day to day", "you will",
]

# Negation patterns — e.g. "no Java needed", "without prior experience"
NEGATION_PATTERNS = [
    r"\bno\s+(prior\s+)?", r"\bnot\s+required\b", r"\bnot\s+needed\b",
    r"\bwithout\s+", r"\bnone\s+",
]


# ---------------------------------------------------------------------------
# Education / experience extraction
# ---------------------------------------------------------------------------

DEGREE_PATTERNS = [
    (r"\b(ph\.?d|doctorate|doctoral)\b", "PhD"),
    (r"\b(m\.?s\.?|master[''s]*\s+(?:of\s+)?(?:science|arts|business|engineering)|m\.?sc|m\.?b\.?a|mba|m\.?eng|m\.?tech)\b", "Master's"),
    (r"\b(b\.?s\.?|bachelor[''s]*\s+(?:of\s+)?(?:science|arts|engineering|technology)|b\.?sc|b\.?e\.?|b\.?tech|bachelors?)\b", "Bachelor's"),
    (r"\b(associate[''s]*\s+degree|a\.?a\.?|a\.?s\.?)\b", "Associate's"),
]

YOE_PATTERNS = [
    r"(\d+)\s*\+?\s*(?:to\s*\d+\s*)?(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)",
    r"(?:at\s+least|minimum\s+of?)\s+(\d+)\s*(?:years?|yrs?)",
    r"(\d+)\s*\+\s*(?:years?|yrs?)",
]


class JobDescriptionAnalyzer:
    """Extract structured information from a JD."""

    def __init__(self, nlp=None) -> None:
        self._nlp = nlp
        self._index = SKILL_INDEX

    def _ensure_nlp(self):
        if self._nlp is None:
            try:
                import spacy
                try:
                    self._nlp = spacy.load(
                        "en_core_web_sm",
                        disable=["parser"],  # tagger + ner only — faster
                    )
                except OSError:
                    logger.warning(
                        "spaCy 'en_core_web_sm' missing. Run: "
                        "python -m spacy download en_core_web_sm. "
                        "Using blank pipeline (regex fallback)."
                    )
                    self._nlp = spacy.blank("en")
            except ImportError:
                logger.warning("spaCy not installed; regex-only mode.")
                self._nlp = None
        return self._nlp

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, jd_text: str) -> Dict:
        if not jd_text or not jd_text.strip():
            return self._empty()

        normalized = self._normalize(jd_text)
        sections = self._segment_sections(normalized)

        # Find skills in each section so we can weight them appropriately.
        section_skills: Dict[str, Set[str]] = {}
        for sec_name, sec_text in sections.items():
            skills = {
                canon for canon, _ in self._index.find_skills(sec_text)
            }
            # Filter out skills inside a negation context.
            skills = {
                s for s in skills
                if not self._is_negated(s, sec_text)
            }
            section_skills[sec_name] = skills

        all_skills: Set[str] = set()
        for s in section_skills.values():
            all_skills |= s

        weights = self._compute_weights(
            normalized, section_skills, all_skills
        )

        hard = sorted(
            [s for s in all_skills if s in get_hard_skills()],
            key=lambda s: -weights.get(s, 0.0),
        )
        soft = sorted(
            [s for s in all_skills if s in get_soft_skills()],
            key=lambda s: -weights.get(s, 0.0),
        )
        all_sorted = sorted(
            list(all_skills), key=lambda s: -weights.get(s, 0.0)
        )

        return {
            "normalized_text": normalized,
            "sections": {k: v for k, v in sections.items() if v},
            "hard_skills": hard,
            "soft_skills": soft,
            "all_skills": all_sorted,
            "skill_weights": weights,
            "required_skills": sorted(
                section_skills.get("required", set()),
                key=lambda s: -weights.get(s, 0.0),
            ),
            "preferred_skills": sorted(
                section_skills.get("nice_to_have", set()),
                key=lambda s: -weights.get(s, 0.0),
            ),
            "min_years_experience": self._extract_yoe(normalized),
            "required_degrees": self._extract_degrees(normalized),
            "top_keywords": self._extract_top_keywords(normalized, n=25),
        }

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _empty() -> Dict:
        return {
            "normalized_text": "",
            "sections": {}, "hard_skills": [], "soft_skills": [],
            "all_skills": [], "skill_weights": {},
            "required_skills": [], "preferred_skills": [],
            "min_years_experience": None, "required_degrees": [],
            "top_keywords": [],
        }

    @staticmethod
    def _normalize(text: str) -> str:
        text = re.sub(r"\r\n?", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _segment_sections(self, text: str) -> Dict[str, str]:
        """
        Split the JD into named sections by header keyword.
        Returns dict: section_name -> body_text (lowercased).
        Sections we track: required, nice_to_have, responsibilities, other.
        """
        text_lower = text.lower()
        # Find header positions for each category.
        markers: List[Tuple[int, str]] = []

        def add_marker(headers: List[str], name: str):
            for h in headers:
                # Header line: header followed by colon or newline.
                for m in re.finditer(
                    rf"(?:^|\n)\s*{re.escape(h)}\s*[:.-]?\s*\n",
                    text_lower,
                ):
                    markers.append((m.start(), name))
                # Inline: "Required:" mid-paragraph.
                for m in re.finditer(
                    rf"\b{re.escape(h)}\s*[:.-]\s",
                    text_lower,
                ):
                    markers.append((m.start(), name))

        add_marker(REQUIRED_HEADERS, "required")
        add_marker(NICE_TO_HAVE_HEADERS, "nice_to_have")
        add_marker(RESPONSIBILITY_HEADERS, "responsibilities")

        markers.sort()
        sections = {"required": "", "nice_to_have": "",
                    "responsibilities": "", "other": ""}

        if not markers:
            sections["other"] = text_lower
            return sections

        # Text before the first marker -> "other"
        first_pos = markers[0][0]
        sections["other"] = text_lower[:first_pos]

        for i, (pos, name) in enumerate(markers):
            end = markers[i + 1][0] if i + 1 < len(markers) else len(text_lower)
            chunk = text_lower[pos:end]
            sections[name] = (sections.get(name, "") + " " + chunk).strip()

        return sections

    @staticmethod
    def _is_negated(skill: str, section_text: str) -> bool:
        """
        Check if every mention of `skill` in `section_text` is preceded
        within ~30 chars by a negation pattern. If at least one mention
        is non-negated, treat it as a positive mention.
        """
        skill_lower = skill.lower()
        positions = [
            m.start() for m in re.finditer(
                re.escape(skill_lower), section_text
            )
        ]
        if not positions:
            return False

        for pos in positions:
            window_start = max(0, pos - 30)
            window = section_text[window_start:pos]
            negated = any(re.search(p, window) for p in NEGATION_PATTERNS)
            if not negated:
                return False  # at least one positive mention — keep it
        return True  # every mention was negated

    def _compute_weights(
        self,
        text: str,
        section_skills: Dict[str, Set[str]],
        all_skills: Set[str],
    ) -> Dict[str, float]:
        """
        Per-skill importance weight in [0, 1].

        Components:
          - Frequency (with diminishing returns)
          - Section bonus: +0.30 if in 'required', +0.10 if in
            'responsibilities', -0.15 if ONLY in 'nice_to_have'
          - Type bonus: +0.10 for hard skills (ATS systems weight tech higher)
        """
        if not all_skills:
            return {}

        text_lower = text.lower()
        weights: Dict[str, float] = {}

        for skill in all_skills:
            skill_lower = skill.lower()
            count = len(re.findall(
                r"(?<![a-z0-9+#./\-])" + re.escape(skill_lower) +
                r"(?![a-z0-9+#./\-])",
                text_lower,
            ))
            count = max(count, 1)
            base = min(count / 3.0, 1.0)

            in_required = skill in section_skills.get("required", set())
            in_nth = skill in section_skills.get("nice_to_have", set())
            in_resp = skill in section_skills.get(
                "responsibilities", set()
            )

            section_bonus = 0.0
            if in_required:
                section_bonus += 0.30
            elif in_resp:
                section_bonus += 0.10
            if in_nth and not in_required and not in_resp:
                section_bonus -= 0.15

            type_bonus = 0.10 if skill in get_hard_skills() else 0.0
            score = base + section_bonus + type_bonus
            weights[skill] = max(0.05, min(score, 1.0))
        return weights

    @staticmethod
    def _extract_yoe(text: str) -> Optional[int]:
        """Smallest minimum-years-experience anchor we can find."""
        candidates = []
        for pat in YOE_PATTERNS:
            for m in re.finditer(pat, text, re.IGNORECASE):
                try:
                    candidates.append(int(m.group(1)))
                except (ValueError, IndexError):
                    pass
        return min(candidates) if candidates else None

    @staticmethod
    def _extract_degrees(text: str) -> List[str]:
        found: Set[str] = set()
        for pat, label in DEGREE_PATTERNS:
            if re.search(pat, text, re.IGNORECASE):
                found.add(label)
        return sorted(found)

    def _extract_top_keywords(self, text: str, n: int = 25) -> List[str]:
        """Surface generic noun phrases not in our taxonomy."""
        nlp = self._ensure_nlp()
        candidates: Counter = Counter()

        if nlp is not None and nlp.has_pipe("tagger"):
            try:
                doc = nlp(text[:50_000])
                if doc.has_annotation("DEP"):
                    for chunk in doc.noun_chunks:
                        phrase = chunk.text.strip().lower()
                        if (2 <= len(phrase) <= 40
                                and not self._is_stopwordy(phrase)):
                            candidates[phrase] += 1
                for ent in doc.ents:
                    if ent.label_ in {"ORG", "PRODUCT",
                                      "WORK_OF_ART", "LANGUAGE"}:
                        candidates[ent.text.strip().lower()] += 2
            except Exception as exc:  # noqa: BLE001
                logger.debug("spaCy keyword pass failed: %s", exc)

        if not candidates:
            tokens = re.findall(r"[A-Za-z][A-Za-z0-9+#./-]{2,30}", text)
            for tok in tokens:
                t = tok.lower()
                if not self._is_stopwordy(t):
                    candidates[t] += 1

        return [kw for kw, _ in candidates.most_common(n)]

    @staticmethod
    def _is_stopwordy(phrase: str) -> bool:
        STOP = {
            "the", "and", "or", "of", "to", "in", "on", "for", "with",
            "a", "an", "is", "are", "be", "by", "as", "at", "from",
            "this", "that", "these", "those", "we", "you", "they",
            "our", "your", "their", "will", "should", "must", "can",
            "have", "has", "had", "etc", "candidate", "role",
            "job", "position", "team", "company", "experience",
            "responsibilities", "qualifications", "skills",
        }
        return phrase in STOP or all(part in STOP for part in phrase.split())

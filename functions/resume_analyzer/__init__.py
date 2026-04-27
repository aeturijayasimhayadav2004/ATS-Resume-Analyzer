"""
resume_analyzer
===============

Self-contained ATS resume analyzer designed for Firebase Functions
(Python 3.11+) with a Vercel/Next.js front-end.

Quick start (inside Firebase Functions or anywhere else):
    from resume_analyzer import ResumeAnalyzer
    analyzer = ResumeAnalyzer()
    result = analyzer.analyze(
        resume_text="...", jd_text="..."
    )
"""

from .analyzer import ResumeAnalyzer
from .ats_scorer import ATSScorer, WEIGHTS
from .jd_analyzer import JobDescriptionAnalyzer
from .keyword_matcher import KeywordMatcher
from .parser import ResumeParser
from .skills_taxonomy import SKILL_INDEX, SKILLS_TAXONOMY, SYNONYMS
from .suggestion_engine import SuggestionEngine

__version__ = "2.0.0"

__all__ = [
    "ResumeAnalyzer",
    "ResumeParser",
    "JobDescriptionAnalyzer",
    "KeywordMatcher",
    "ATSScorer",
    "SuggestionEngine",
    "SKILL_INDEX",
    "SKILLS_TAXONOMY",
    "SYNONYMS",
    "WEIGHTS",
]

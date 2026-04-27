"""
SuggestionEngine: ranked, actionable suggestions to improve ATS score.
"""

from __future__ import annotations

from typing import Dict, List


class SuggestionEngine:
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    def generate(
        self,
        match_result: Dict,
        score_result: Dict,
        jd_skill_weights: Dict[str, float],
        jd_required_skills: List[str],
        jd_preferred_skills: List[str],
    ) -> List[Dict]:
        out: List[Dict] = []
        out.extend(self._keyword_suggestions(
            match_result, jd_skill_weights,
            jd_required_skills, jd_preferred_skills,
        ))
        out.extend(self._section_suggestions(
            score_result.get("section_analysis", {})
        ))
        out.extend(self._formatting_suggestions(
            score_result.get("formatting_issues", [])
        ))
        out.extend(self._achievement_suggestions(
            score_result.get("achievement_stats", {})
        ))
        out.extend(self._experience_suggestions(
            score_result.get("experience_check", {})
        ))
        out.extend(self._education_suggestions(
            score_result.get("education_check", {})
        ))
        out.extend(self._overall_suggestions(score_result))

        order = {self.HIGH: 0, self.MEDIUM: 1, self.LOW: 2}
        out.sort(key=lambda s: order.get(s["priority"], 3))
        return out

    # ------------------------------------------------------------------

    def _keyword_suggestions(
        self,
        match_result: Dict,
        weights: Dict[str, float],
        required: List[str],
        preferred: List[str],
    ) -> List[Dict]:
        out: List[Dict] = []
        missing = match_result.get("missing", []) or []
        partial = match_result.get("partial", []) or []

        # Priority A: missing skills that were in the REQUIRED section.
        required_set = set(required)
        missing_required = [m for m in missing if m in required_set]
        missing_other = [m for m in missing if m not in required_set]

        if missing_required:
            ranked = sorted(
                missing_required, key=lambda s: -weights.get(s, 0.0)
            )
            out.append({
                "priority": self.HIGH,
                "category": "keywords",
                "title": "Add missing REQUIRED keywords",
                "message": (
                    "These keywords were in the JD's 'required' section but "
                    "are absent from your resume: "
                    + ", ".join(ranked[:10])
                    + ". Add them naturally where they reflect your real "
                    "experience — don't keyword-stuff."
                ),
                "items": ranked[:10],
            })

        if missing_other:
            ranked = sorted(missing_other, key=lambda s: -weights.get(s, 0.0))
            top = ranked[:8]
            preferred_set = set(preferred)
            in_preferred = [s for s in top if s in preferred_set]
            general = [s for s in top if s not in preferred_set]

            if general:
                out.append({
                    "priority": self.HIGH,
                    "category": "keywords",
                    "title": "Add missing high-impact keywords",
                    "message": (
                        "Your resume is missing these JD keywords: "
                        + ", ".join(general)
                        + "."
                    ),
                    "items": general,
                })
            if in_preferred:
                out.append({
                    "priority": self.MEDIUM,
                    "category": "keywords",
                    "title": "Consider adding 'preferred' keywords",
                    "message": (
                        "These were marked as 'preferred' / 'nice-to-have' "
                        "in the JD: "
                        + ", ".join(in_preferred)
                        + "."
                    ),
                    "items": in_preferred,
                })

        if partial:
            partial_skills = [s for s, _ in partial]
            out.append({
                "priority": self.MEDIUM,
                "category": "keywords",
                "title": "Strengthen partially-matched skills",
                "message": (
                    "These skills appear partially or with typos: "
                    + ", ".join(partial_skills)
                    + ". Use the exact phrasing from the JD where it "
                    "applies (e.g. 'Machine Learning' rather than 'ML')."
                ),
                "items": partial_skills,
            })
        return out

    def _section_suggestions(self, sections: Dict[str, bool]) -> List[Dict]:
        if not sections:
            return []
        missing = [n for n, p in sections.items() if not p]
        if not missing:
            return []
        critical = {"contact", "experience", "education", "skills"}
        critical_missing = [s for s in missing if s in critical]
        nice_missing = [s for s in missing if s not in critical]
        out: List[Dict] = []
        if critical_missing:
            out.append({
                "priority": self.HIGH,
                "category": "sections",
                "title": "Add critical missing sections",
                "message": (
                    "ATS parsers look for standard section headers. "
                    "Your resume is missing: "
                    + ", ".join(s.title() for s in critical_missing)
                    + ". Add a clearly-labelled section for each."
                ),
                "items": critical_missing,
            })
        if nice_missing:
            out.append({
                "priority": self.LOW,
                "category": "sections",
                "title": "Consider adding optional sections",
                "message": (
                    "Optional sections that strengthen most resumes: "
                    + ", ".join(s.title() for s in nice_missing) + "."
                ),
                "items": nice_missing,
            })
        return out

    def _formatting_suggestions(self, issues: List[str]) -> List[Dict]:
        if not issues:
            return []
        return [{
            "priority": self.HIGH,
            "category": "formatting",
            "title": "Fix ATS-unfriendly formatting",
            "message": (
                "ATS systems often fail on non-standard layouts. Issues: "
                + " | ".join(issues)
            ),
            "items": issues,
        }]

    def _achievement_suggestions(self, stats: Dict) -> List[Dict]:
        if not stats:
            return []
        out: List[Dict] = []
        verbs = stats.get("action_verb_count", 0)
        nums = stats.get("numeric_metrics", 0)
        if verbs < 5:
            out.append({
                "priority": self.MEDIUM,
                "category": "achievements",
                "title": "Use more strong action verbs",
                "message": (
                    f"Only {verbs} distinct strong action verbs detected. "
                    "Start each bullet with a verb like 'Built', 'Led', "
                    "'Optimized', 'Reduced', 'Designed', 'Delivered'."
                ),
                "items": [],
            })
        if nums < 4:
            out.append({
                "priority": self.HIGH,
                "category": "achievements",
                "title": "Quantify your achievements",
                "message": (
                    f"Found only {nums} numeric metrics. Add concrete "
                    "numbers — percentages, dollar amounts, time saved, "
                    "users impacted. 'Reduced API latency by 35%' beats "
                    "'Made the API faster.'"
                ),
                "items": [],
            })
        return out

    def _experience_suggestions(self, exp: Dict) -> List[Dict]:
        if not exp or exp.get("meets_requirement") is None:
            return []
        if exp.get("meets_requirement"):
            return []
        return [{
            "priority": self.MEDIUM,
            "category": "experience",
            "title": "Years-of-experience gap",
            "message": (
                f"The JD asks for {exp['jd_min_years']}+ years; your "
                f"resume shows about {exp.get('resume_years_detected') or '?'} "
                "years. If you have additional informal/project experience, "
                "make it explicit in your summary."
            ),
            "items": [],
        }]

    def _education_suggestions(self, edu: Dict) -> List[Dict]:
        if not edu or edu.get("meets_requirement") is None:
            return []
        if edu.get("meets_requirement"):
            return []
        return [{
            "priority": self.MEDIUM,
            "category": "education",
            "title": "Education requirement gap",
            "message": (
                "The JD lists "
                + ", ".join(edu.get("jd_required_degrees", []))
                + " as required. Your resume shows "
                + (", ".join(edu.get("resume_degrees", []))
                   or "no degree detected")
                + ". If you hold an equivalent qualification, ensure it's "
                "listed under Education."
            ),
            "items": edu.get("jd_required_degrees", []),
        }]

    def _overall_suggestions(self, score_result: Dict) -> List[Dict]:
        score = score_result.get("ats_score", 0.0)
        if score < 50:
            return [{
                "priority": self.HIGH,
                "category": "overall",
                "title": "Significant rework recommended",
                "message": (
                    f"Overall ATS score is {score}/100. Focus first on "
                    "the high-priority items above — keywords and sections "
                    "typically move the needle the most."
                ),
                "items": [],
            }]
        if score < 75:
            return [{
                "priority": self.MEDIUM,
                "category": "overall",
                "title": "Good base — refine for the role",
                "message": (
                    f"ATS score is {score}/100. Tightening keyword "
                    "coverage and quantifying achievements should push "
                    "you over 80."
                ),
                "items": [],
            }]
        return [{
            "priority": self.LOW,
            "category": "overall",
            "title": "Strong match",
            "message": (
                f"ATS score is {score}/100. The resume aligns well with "
                "this JD. Review remaining suggestions for polish."
            ),
            "items": [],
        }]

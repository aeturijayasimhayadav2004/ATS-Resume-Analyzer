"""
End-to-end tests for ResumeAnalyzer.

Run from the `functions/` directory:
    python tests/test_analyzer.py

Tests:
  1. Strong match (Python backend resume vs Python backend JD)
  2. Weak match (designer resume vs Python backend JD)
  3. Synonym handling (resume uses 'JS' / 'K8s' / 'ML', JD uses canonical)
  4. Negation handling (JD says 'no Java required')
  5. Required vs nice-to-have weighting
  6. Edge cases (empty resume, empty JD)
"""

from __future__ import annotations

import json
import os
import sys

# Make the functions/ directory importable when running this file directly.
HERE = os.path.dirname(os.path.abspath(__file__))
FUNCTIONS_DIR = os.path.dirname(HERE)
sys.path.insert(0, FUNCTIONS_DIR)

from resume_analyzer import ResumeAnalyzer  # noqa: E402


# ---------------------------------------------------------------------------
# Sample data
# ---------------------------------------------------------------------------

JD_PYTHON_BACKEND = """
We are hiring a Senior Python Backend Engineer.

Required:
- 4+ years of Python experience
- Strong knowledge of Django or Flask
- PostgreSQL, Redis, and REST API design
- Docker and Kubernetes for deployment
- AWS (EC2, S3, Lambda)
- Experience with CI/CD pipelines (GitHub Actions or Jenkins)
- Unit testing with pytest
- Git for version control
- Bachelor's degree in Computer Science or related field

Nice to have:
- Experience with Kafka or RabbitMQ
- Machine Learning exposure
- GraphQL
- TypeScript / React for occasional frontend work

Responsibilities:
- Design and build scalable microservices
- Lead code reviews and mentor junior engineers
- Reduce API latency and improve system reliability
- Collaborate with product, design, and data teams
"""

RESUME_STRONG = """
John Doe
Email: john.doe@example.com | Phone: +1-555-0100
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Senior backend engineer with 6 years of experience building scalable
Python services. Specialized in Django, Flask, and microservice
architectures on AWS.

WORK EXPERIENCE
Senior Backend Engineer, Acme Corp (2021 - Present)
- Built 12 microservices using Python and Django, serving 2M daily users
- Reduced API latency by 40% through Redis caching and query optimization
- Deployed services on AWS EC2 and Lambda using Docker and Kubernetes
- Led 6 engineers in agile sprints; mentored 3 junior developers
- Implemented CI/CD pipelines with GitHub Actions, cutting deploy time by 60%

Backend Developer, Beta Inc (2018 - 2021)
- Developed REST APIs in Flask handling 500K requests/day
- Migrated legacy MySQL database to PostgreSQL, improving query speed 3x
- Wrote pytest unit tests achieving 92% code coverage
- Used Git for version control and Jenkins for automated builds

EDUCATION
B.S. Computer Science, State University, 2018

SKILLS
Python, Django, Flask, PostgreSQL, Redis, REST API, Docker, Kubernetes,
AWS, GitHub Actions, Jenkins, pytest, Git, Linux, Agile

PROJECTS
Open Source Contributor — Submitted 25 PRs to popular Python libraries.
"""

RESUME_WEAK = """
Jane Smith
jane@example.com

About Me
I love graphic design and creating beautiful posters.

Experience
Designer at Local Studio (2022 - Present)
- Designed flyers and brochures for local businesses
- Used Adobe Photoshop and Illustrator daily

Education
B.A. Fine Arts

Skills
Photoshop, Illustrator, Drawing, Painting
"""

# Resume that uses ABBREVIATIONS / SYNONYMS for the JD's canonical skills
RESUME_WITH_SYNONYMS = """
Alex Kim
alex@example.com | linkedin.com/in/alexkim

SUMMARY
6 years building production services. Strong in JS and TS.

EXPERIENCE
Senior Engineer, FooCorp (2020 - Present)
- Built REST APIs using Flask + Postgres, deployed via K8s on AWS
- Implemented ML models with TF and sklearn for recommendation engine
- Wrote unit tests with pytest; CI/CD via Jenkins
- Used Git daily; led code reviews for team of 8
- Worked with Python, K8s, and ReactJS in production

EDUCATION
M.S. Computer Science, Tech University, 2018

SKILLS
Python, JS, TS, Flask, Postgres, K8s, Docker, AWS, ML, sklearn, TF, REST APIs, ReactJS
"""

JD_WITH_NEGATION = """
We are hiring a Frontend Developer.
Required:
- React, TypeScript, CSS expertise
- 3+ years of frontend development experience
- No prior Java experience required

Responsibilities:
- Build modern web UIs with React and Next.js
"""

RESUME_FRONTEND = """
Sam Patel
sam@example.com

EXPERIENCE
Frontend Developer at WebCo (2021 - Present)
- Built interfaces with React and TypeScript
- Designed responsive layouts using CSS and Tailwind

EDUCATION
B.S. Computer Science

SKILLS
React, TypeScript, CSS, HTML, JavaScript
"""


# ---------------------------------------------------------------------------
# Pretty printing
# ---------------------------------------------------------------------------

def _print(label: str, result: dict) -> None:
    print("\n" + "=" * 72)
    print(f"  {label}")
    print("=" * 72)
    print(f"ATS Score: {result['ats_score']} / 100")
    print(f"Breakdown: {json.dumps(result['score_breakdown'])}")
    sim = result.get("similarity", {})
    print(f"Similarity: TF-IDF={sim.get('tfidf')} "
          f"Semantic={sim.get('semantic')}")
    matched = result["matched_keywords"]
    missing = result["missing_keywords"]
    print(f"\nMatched ({len(matched)}): "
          f"{', '.join(matched[:12])}"
          f"{' ...' if len(matched) > 12 else ''}")
    print(f"Missing ({len(missing)}): "
          f"{', '.join(missing[:12])}"
          f"{' ...' if len(missing) > 12 else ''}")
    if result.get("partial_matches"):
        print(f"Partial: {len(result['partial_matches'])} matches")
    print(f"\nExperience: {result.get('experience_check', {})}")
    print(f"Education:  {result.get('education_check', {})}")
    print(f"\nTop 3 suggestions:")
    for s in result["suggestions"][:3]:
        print(f"  [{s['priority'].upper()}] {s['title']}")
        msg = s["message"]
        if len(msg) > 130:
            msg = msg[:127] + "..."
        print(f"    {msg}")


def _check(label: str, condition: bool, detail: str = "") -> bool:
    if condition:
        print(f"PASS  {label}")
        return True
    print(f"FAIL  {label}  {detail}")
    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    failures = 0
    print("Loading ResumeAnalyzer (cold start can take ~30s)...")
    analyzer = ResumeAnalyzer(load_semantic_model=True)
    print(f"Ready. Semantic model: "
          f"{'YES' if analyzer._sentence_model else 'NO (TF-IDF only)'}")
    print(f"       spaCy:           "
          f"{'YES' if analyzer._spacy_nlp else 'NO (regex only)'}\n")

    # ----- Scenario 1: strong match -----
    r1 = analyzer.analyze(
        resume_text=RESUME_STRONG, jd_text=JD_PYTHON_BACKEND,
    )
    _print("Scenario 1: Strong match (Python backend)", r1)
    failures += not _check("strong match scores >= 65", r1["ats_score"] >= 65,
                           f"got {r1['ats_score']}")
    expected = {"Python", "Django", "Flask", "Docker", "Kubernetes", "AWS",
                "PostgreSQL", "Redis"}
    matched = set(r1["matched_keywords"])
    missing_expected = expected - matched
    failures += not _check("strong match contains all core skills",
                           not missing_expected,
                           f"missing: {missing_expected}")

    # ----- Scenario 2: weak match -----
    r2 = analyzer.analyze(
        resume_text=RESUME_WEAK, jd_text=JD_PYTHON_BACKEND,
    )
    _print("Scenario 2: Weak match (designer vs backend JD)", r2)
    failures += not _check(
        "weak match scores below strong match",
        r2["ats_score"] < r1["ats_score"],
        f"weak={r2['ats_score']} strong={r1['ats_score']}",
    )
    failures += not _check(
        "weak match generates >= 3 suggestions",
        len(r2["suggestions"]) >= 3,
        f"got {len(r2['suggestions'])}",
    )

    # ----- Scenario 3: synonym handling -----
    r3 = analyzer.analyze(
        resume_text=RESUME_WITH_SYNONYMS, jd_text=JD_PYTHON_BACKEND,
    )
    _print("Scenario 3: Synonyms (PY/JS/TS/K8s/PG/ML)", r3)
    matched3 = set(r3["matched_keywords"])
    # These canonicals appear in the JD AND should resolve from the
    # abbreviations used in the resume.
    expected_synonyms = {"Python", "Kubernetes", "PostgreSQL",
                         "Machine Learning", "React"}
    missing_syn = expected_synonyms - matched3
    failures += not _check(
        "synonym map: K8s/Postgres/ML/ReactJS all resolve to canonical",
        not missing_syn,
        f"not matched: {missing_syn}",
    )

    # ----- Scenario 4: negation handling -----
    r4 = analyzer.analyze(
        resume_text=RESUME_FRONTEND, jd_text=JD_WITH_NEGATION,
    )
    _print("Scenario 4: Negation ('no Java required')", r4)
    matched4 = set(r4["matched_keywords"])
    missing4 = set(r4["missing_keywords"])
    all_jd4 = matched4 | missing4
    failures += not _check(
        "negated 'Java' is excluded from JD skills",
        "Java" not in all_jd4,
        f"Java appeared in JD skills: {all_jd4}",
    )
    failures += not _check(
        "frontend resume scores >= 60 against frontend JD",
        r4["ats_score"] >= 60,
        f"got {r4['ats_score']}",
    )

    # ----- Scenario 5: required vs preferred separation -----
    failures += not _check(
        "JD required_skills populated for python backend",
        len(r1.get("jd_required_skills", [])) >= 5,
        f"got {len(r1.get('jd_required_skills', []))}",
    )

    # ----- Scenario 6: experience/education extraction -----
    exp_check = r1.get("experience_check", {})
    failures += not _check(
        "experience check picks up '4+ years' from JD",
        exp_check.get("jd_min_years") == 4,
        f"got {exp_check.get('jd_min_years')}",
    )
    edu_check = r1.get("education_check", {})
    failures += not _check(
        "education check picks up 'Bachelor' from JD",
        "Bachelor's" in edu_check.get("jd_required_degrees", []),
        f"got {edu_check.get('jd_required_degrees')}",
    )

    # ----- Scenario 7: edge cases -----
    print("\n" + "=" * 72)
    print("  Scenario 7: Edge cases")
    print("=" * 72)
    r_empty_resume = analyzer.analyze(
        resume_text="", jd_text=JD_PYTHON_BACKEND,
    )
    failures += not _check(
        "empty resume scores 0", r_empty_resume["ats_score"] == 0.0,
        f"got {r_empty_resume['ats_score']}",
    )
    r_empty_jd = analyzer.analyze(
        resume_text=RESUME_STRONG, jd_text="",
    )
    failures += not _check(
        "empty JD scores 0", r_empty_jd["ats_score"] == 0.0,
        f"got {r_empty_jd['ats_score']}",
    )
    try:
        analyzer.analyze(jd_text=JD_PYTHON_BACKEND)
        failures += not _check("missing inputs raises ValueError", False,
                               "did not raise")
    except ValueError:
        failures += not _check("missing inputs raises ValueError", True)

    # ----- Final tally -----
    print("\n" + "=" * 72)
    if failures == 0:
        print("ALL CHECKS PASSED")
        return 0
    print(f"{failures} CHECK(S) FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())

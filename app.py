import os
import streamlit as st
from resume_analyzer import ResumeAnalyzer

# ---------------------------------------------------------------------------
# Init — load once per session.
# On Streamlit Community Cloud (1 GB RAM) we skip sentence-transformers
# to avoid OOM; TF-IDF + spaCy still give accurate ATS scoring.
# ---------------------------------------------------------------------------

def _try_semantic() -> bool:
    """Return True only if we have enough RAM for sentence-transformers."""
    try:
        import psutil
        available_mb = psutil.virtual_memory().available / (1024 * 1024)
        return available_mb > 700
    except ImportError:
        # psutil not installed — check env flag or default to False on Cloud
        return os.environ.get("ENABLE_SEMANTIC", "0") == "1"

@st.cache_resource(show_spinner="Loading ML models (first run may take ~30s)...")
def load_analyzer() -> ResumeAnalyzer:
    use_semantic = _try_semantic()
    return ResumeAnalyzer(load_semantic_model=use_semantic)


ANALYZER = load_analyzer()

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="ATS Resume Analyzer",
    page_icon=":mag_right:",
    layout="wide",
)

st.title("ATS Resume Analyzer")
_mode = "TF-IDF + spaCy + Semantic" if ANALYZER._sentence_model else "TF-IDF + spaCy"
st.caption(f"Powered by local ML models ({_mode}) — no external API required.")

# ---------------------------------------------------------------------------
# Input section
# ---------------------------------------------------------------------------

col_jd, col_resume = st.columns(2)

with col_jd:
    jd_text = st.text_area(
        "Job Description",
        height=300,
        placeholder="Paste the full job description here...",
        key="jd_input",
    )

with col_resume:
    uploaded_file = st.file_uploader(
        "Upload Resume",
        type=["pdf", "docx", "txt"],
        help="Supported formats: PDF, DOCX, TXT",
    )
    if uploaded_file:
        st.success(f"Uploaded: {uploaded_file.name}")

analyze_btn = st.button(
    "Analyze Resume",
    type="primary",
    disabled=(not jd_text.strip() or uploaded_file is None),
)

# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

if analyze_btn:
    if not jd_text.strip():
        st.error("Please paste a job description.")
        st.stop()
    if uploaded_file is None:
        st.error("Please upload a resume (PDF, DOCX, or TXT).")
        st.stop()

    with st.spinner("Analyzing your resume against the job description..."):
        ext = "." + uploaded_file.name.rsplit(".", 1)[-1].lower()
        resume_bytes = uploaded_file.read()
        result = ANALYZER.analyze(
            jd_text=jd_text,
            resume_bytes=resume_bytes,
            resume_extension=ext,
        )

    # -----------------------------------------------------------------------
    # Results
    # -----------------------------------------------------------------------

    ats_score = result.get("ats_score", 0)

    st.divider()
    st.subheader("Results")

    # --- ATS Score ---
    score_col, breakdown_col = st.columns([1, 2])

    with score_col:
        color = (
            "green" if ats_score >= 75
            else "orange" if ats_score >= 50
            else "red"
        )
        st.markdown(
            f"<h1 style='color:{color};text-align:center'>{ats_score:.1f}<br>"
            f"<small style='font-size:0.4em;color:#888'>/ 100 ATS Score</small></h1>",
            unsafe_allow_html=True,
        )
        if ats_score >= 75:
            st.success("Strong ATS match!")
        elif ats_score >= 50:
            st.warning("Moderate match — some gaps to address.")
        else:
            st.error("Weak match — significant improvements needed.")

    with breakdown_col:
        st.markdown("**Score Breakdown**")
        breakdown = result.get("score_breakdown", {})
        weights = result.get("weights", {})
        for dim, pts in breakdown.items():
            label = dim.replace("_", " ").title()
            pct = weights.get(dim, 0) * 100
            st.progress(
                int(pts / (pct or 1) * 100) if pct else 0,
                text=f"{label}: {pts:.1f} / {pct:.0f} pts",
            )

    # --- Similarity ---
    sim = result.get("similarity", {})
    tfidf = sim.get("tfidf", 0)
    semantic = sim.get("semantic")
    sim_cols = st.columns(2 if semantic is None else 3)
    sim_cols[0].metric("TF-IDF Similarity", f"{tfidf*100:.1f}%")
    if semantic is not None:
        sim_cols[1].metric("Semantic Similarity", f"{semantic*100:.1f}%")

    st.divider()

    # --- Keyword Analysis ---
    kw_col1, kw_col2 = st.columns(2)

    with kw_col1:
        matched = result.get("matched_keywords", [])
        st.markdown(f"**Matched Keywords** ({len(matched)})")
        if matched:
            st.markdown(
                " ".join(
                    f'<span style="background:#d4edda;color:#155724;'
                    f'padding:2px 8px;border-radius:12px;margin:2px;'
                    f'display:inline-block">{k}</span>'
                    for k in sorted(matched)
                ),
                unsafe_allow_html=True,
            )
        else:
            st.info("No matched keywords found.")

    with kw_col2:
        missing = result.get("missing_keywords", [])
        st.markdown(f"**Missing Keywords** ({len(missing)})")
        if missing:
            st.markdown(
                " ".join(
                    f'<span style="background:#f8d7da;color:#721c24;'
                    f'padding:2px 8px;border-radius:12px;margin:2px;'
                    f'display:inline-block">{k}</span>'
                    for k in sorted(missing)
                ),
                unsafe_allow_html=True,
            )
        else:
            st.success("All keywords matched!")

    # --- Partial matches ---
    partials = result.get("partial_matches", [])
    if partials:
        with st.expander(f"Partial Matches ({len(partials)})"):
            for pm in partials:
                st.markdown(f"- **{pm['skill']}** — *{pm['evidence']}*")

    st.divider()

    # --- Section analysis ---
    sections = result.get("section_analysis", {})
    if sections:
        st.markdown("**Resume Sections**")
        sec_cols = st.columns(len(sections))
        for i, (sec, present) in enumerate(sections.items()):
            icon = "✅" if present else "❌"
            sec_cols[i].markdown(
                f"{icon} **{sec.title()}**",
                help=f"{'Found' if present else 'Not found'} in resume",
            )

    st.divider()

    # --- Suggestions ---
    suggestions = result.get("suggestions", [])
    if suggestions:
        st.subheader("Suggestions")
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions_sorted = sorted(
            suggestions,
            key=lambda s: priority_order.get(s.get("priority", "low"), 2),
        )
        for sug in suggestions_sorted:
            priority = sug.get("priority", "low")
            icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(priority, "⚪")
            with st.expander(
                f"{icon} [{priority.upper()}] {sug.get('title', '')}",
                expanded=(priority == "high"),
            ):
                st.markdown(sug.get("message", ""))
                items = sug.get("items", [])
                if items:
                    for item in items:
                        st.markdown(f"- {item}")

    # --- Formatting issues ---
    fmt_issues = result.get("formatting_issues", [])
    if fmt_issues:
        with st.expander("Formatting Issues"):
            for issue in fmt_issues:
                st.warning(issue)

    # --- Achievement stats ---
    ach = result.get("achievement_stats", {})
    if ach:
        with st.expander("Achievement Analysis"):
            a1, a2, a3 = st.columns(3)
            a1.metric("Action Verbs", ach.get("action_verb_count", 0))
            a2.metric("Numeric Metrics", ach.get("numeric_metrics", 0))
            a3.metric(
                "Quantification Score",
                f"{ach.get('quantification_score', 0)*100:.0f}%",
            )
            verbs = ach.get("action_verbs", [])
            if verbs:
                st.markdown("**Action verbs found:** " + ", ".join(sorted(verbs)))

    # --- JD required vs preferred skills ---
    req_skills = result.get("jd_required_skills", [])
    pref_skills = result.get("jd_preferred_skills", [])
    if req_skills or pref_skills:
        with st.expander("JD Skill Requirements"):
            if req_skills:
                st.markdown("**Required:** " + ", ".join(req_skills))
            if pref_skills:
                st.markdown("**Preferred:** " + ", ".join(pref_skills))

    # --- Experience & Education checks ---
    exp_chk = result.get("experience_check", {})
    edu_chk = result.get("education_check", {})
    if exp_chk or edu_chk:
        with st.expander("Experience & Education"):
            if exp_chk.get("jd_min_years") is not None:
                meets = exp_chk.get("meets_requirement")
                icon = "✅" if meets else ("❌" if meets is False else "⚠️")
                st.markdown(
                    f"{icon} JD requires **{exp_chk['jd_min_years']}+ years** — "
                    f"Resume shows ~{exp_chk.get('resume_years_detected', 'N/A')} years"
                )
            if edu_chk.get("jd_required_degrees"):
                meets = edu_chk.get("meets_requirement")
                icon = "✅" if meets else ("❌" if meets is False else "⚠️")
                st.markdown(
                    f"{icon} JD requires: **{', '.join(edu_chk['jd_required_degrees'])}** — "
                    f"Resume: {', '.join(edu_chk.get('resume_degrees', [])) or 'None detected'}"
                )

    # --- Meta ---
    meta = result.get("meta", {})
    if meta and not meta.get("error"):
        with st.expander("Analysis Meta"):
            m1, m2, m3 = st.columns(3)
            m1.metric("Resume Words", meta.get("resume_word_count", 0))
            m2.metric("JD Words", meta.get("jd_word_count", 0))
            m3.metric("JD Skills Total", meta.get("jd_skills_total", 0))
            sem_loaded = meta.get("semantic_model_loaded", False)
            spacy_loaded = meta.get("spacy_loaded", False)
            st.caption(
                f"spaCy: {'loaded' if spacy_loaded else 'not loaded'} | "
                f"Semantic model: {'loaded' if sem_loaded else 'not loaded'}"
            )

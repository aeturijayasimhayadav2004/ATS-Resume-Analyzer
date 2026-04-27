"""
Firebase Cloud Functions (2nd gen) entry point — Python 3.11+.

Deploys two callable HTTP functions:

  analyze_resume          - HTTPS callable (preferred from Firebase JS SDK)
                            Receives JSON {resume_text, jd_text}
                            OR {resume_base64, resume_extension, jd_text}

  analyze_resume_http     - Plain HTTP endpoint with CORS for non-Firebase
                            clients (curl, Postman, third-party). Same
                            payload as the callable.

Firebase 2nd gen auto-deploys this file and pulls dependencies from
requirements.txt. The Python runtime is set in firebase.json.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict

from firebase_functions import https_fn, options

# Set CPU/memory at the module level so Firebase configures the Cloud Run
# container correctly. Heavy ML libs (sentence-transformers) need >=1 CPU
# and ~1 GiB RAM to load comfortably.
options.set_global_options(
    region="us-central1",
    memory=options.MemoryOption.GB_2,
    cpu=2,
    concurrency=10,         # 10 simultaneous analyses per warm instance
    min_instances=0,        # 0 = scales to zero (cheapest)
    max_instances=10,
    timeout_sec=120,
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("resume_analyzer.main")

# Build the analyzer once on cold start so spaCy + sentence-transformers
# load before any request arrives. Subsequent requests on the same warm
# instance reuse the loaded models.
log.info("Bootstrapping ResumeAnalyzer...")
from resume_analyzer import ResumeAnalyzer  # noqa: E402
ANALYZER = ResumeAnalyzer(load_semantic_model=True)
log.info("ResumeAnalyzer ready.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _do_analysis(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Run analysis from a payload dict and return the result dict."""
    jd_text = (payload.get("jd_text") or "").strip()
    if not jd_text:
        raise ValueError("'jd_text' is required")

    resume_text = payload.get("resume_text")
    resume_b64 = payload.get("resume_base64")
    resume_ext = payload.get("resume_extension")

    if resume_text:
        return ANALYZER.analyze(resume_text=resume_text, jd_text=jd_text)
    if resume_b64:
        if not resume_ext:
            raise ValueError(
                "'resume_extension' (.pdf/.docx/.txt) required with "
                "'resume_base64'"
            )
        try:
            data = base64.b64decode(resume_b64, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Invalid base64 resume: {exc}") from exc
        return ANALYZER.analyze(
            resume_bytes=data,
            resume_extension=resume_ext,
            jd_text=jd_text,
        )
    raise ValueError(
        "Provide either 'resume_text' or 'resume_base64' "
        "(plus 'resume_extension')"
    )


# ---------------------------------------------------------------------------
# HTTPS Callable — preferred for Firebase JS SDK clients
# ---------------------------------------------------------------------------

@https_fn.on_call(
    cors=options.CorsOptions(
        cors_origins="*",      # tighten to your Vercel domain in prod
        cors_methods=["post"],
    ),
)
def analyze_resume(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Firebase HTTPS callable. Invoke from JS:

        import { getFunctions, httpsCallable } from "firebase/functions";
        const fns = getFunctions();
        const fn = httpsCallable(fns, "analyze_resume");
        const { data } = await fn({
          resume_text: "...",
          jd_text: "..."
        });
    """
    try:
        payload = req.data or {}
        return _do_analysis(payload)
    except ValueError as ve:
        # Map to the SDK's typed error so JS gets a nice {code, message}
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT, str(ve)
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("analyze_resume failed")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {exc}",
        )


# ---------------------------------------------------------------------------
# Plain HTTP endpoint — for non-Firebase clients
# ---------------------------------------------------------------------------

# Domains allowed to call from a browser (CORS). For production tighten to
# your Vercel deployment URL e.g. ["https://your-app.vercel.app"].
_CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "*",
)


@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=_CORS_ORIGINS,
        cors_methods=["GET", "POST", "OPTIONS"],
    ),
)
def analyze_resume_http(req: https_fn.Request) -> https_fn.Response:
    """
    Plain HTTP endpoint. Use from Vercel/Next.js if you don't want the
    Firebase SDK on the client:

        const r = await fetch(FN_URL, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ resume_text: "...", jd_text: "..." })
        });
    """
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)

    if req.method == "GET":
        return https_fn.Response(
            json.dumps({"status": "ok", "service": "resume-analyzer"}),
            mimetype="application/json",
        )

    if req.method != "POST":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405, mimetype="application/json",
        )

    try:
        payload = req.get_json(silent=True) or {}
        result = _do_analysis(payload)
        return https_fn.Response(
            json.dumps(result), mimetype="application/json"
        )
    except ValueError as ve:
        return https_fn.Response(
            json.dumps({"error": str(ve)}),
            status=400, mimetype="application/json",
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("analyze_resume_http failed")
        return https_fn.Response(
            json.dumps({"error": "Internal server error",
                        "detail": str(exc)}),
            status=500, mimetype="application/json",
        )

import { ATSResult } from "@/types";

export async function getResumeReview(
  resumeContent: { base64?: string; text?: string },
  jobDescription: string,
  domain: string
): Promise<string> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "review", resumeContent, jobDescription, domain }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Resume review failed");
  }

  const data = await res.json();
  return data.review as string;
}

export async function getATSScore(
  resumeContent: { base64?: string; text?: string },
  jobDescription: string,
  domain: string
): Promise<ATSResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "ats", resumeContent, jobDescription, domain }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "ATS scoring failed");
  }

  const data = await res.json();
  return data.atsResult as ATSResult;
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeProfile, ATSResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function getGroq() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

const MODEL = "llama-3.3-70b-versatile";

function profileToPlainText(r: ResumeProfile): string {
  const lines: string[] = [];
  lines.push(r.name, r.email, r.phone, r.location);
  if (r.linkedin) lines.push(r.linkedin);
  if (r.github) lines.push(r.github);
  lines.push("", "SUMMARY", r.summary);

  if (r.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const e of r.experience) {
      lines.push(`${e.title} | ${e.company} | ${e.location} | ${e.startDate} – ${e.endDate}`);
      e.bullets.forEach((b) => lines.push(`• ${b}`));
    }
  }

  if (r.education.length) {
    lines.push("", "EDUCATION");
    for (const e of r.education) {
      lines.push(`${e.degree} | ${e.institution} | ${e.graduationDate}`);
      if (e.gpa) lines.push(`GPA: ${e.gpa}`);
    }
  }

  if (r.skills.length) {
    lines.push("", "SKILLS");
    for (const s of r.skills) {
      lines.push(`${s.category}: ${s.items.join(", ")}`);
    }
  }

  if (r.projects?.length) {
    lines.push("", "PROJECTS");
    for (const p of r.projects) {
      lines.push(`${p.name}: ${p.description}`);
      lines.push(`Technologies: ${p.technologies.join(", ")}`);
    }
  }

  if (r.certifications?.length) {
    lines.push("", "CERTIFICATIONS");
    for (const c of r.certifications) {
      lines.push(`${c.name} | ${c.issuer} | ${c.date}`);
    }
  }

  return lines.join("\n");
}

async function scoreResume(
  resumeText: string,
  jobDescription: string,
  domain: string
): Promise<{ score: number; missingKeywords: string[]; feedback: string }> {
  const prompt = `You are a strict, calibrated ATS (Applicant Tracking System) scorer. Score this resume against the job description using EXACT keyword matching only — not semantic similarity.

Scoring scale (be honest and strict):
- 90-100: Nearly every required skill, tool, and qualification is explicitly present word-for-word
- 75-89: Most required skills present, only minor gaps
- 55-74: About half the required skills present, notable gaps in key areas
- 35-54: Few required skills, major keyword gaps
- 0-34: Almost no matching keywords or serious qualification mismatch

Rules:
- Count only EXACT or very near-exact keyword matches (e.g. "React" ≠ "web frameworks")
- Required skills/tools mentioned multiple times in the JD carry more weight
- Missing a required qualification (e.g. years of experience, specific degree) lowers score significantly
- Do NOT inflate scores — a realistic score matters more than an optimistic one

Return ONLY JSON:
{
  "score": <number 0-100>,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "extraKeywords": ["string"],
  "suggestions": ["string"],
  "feedback": "1-2 sentences on what to improve for higher score"
}
Job Description: ${jobDescription}
Domain: ${domain}
Resume:
${resumeText}`;

  const response = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}") as ATSResult & {
    feedback: string;
  };
  return {
    score: parsed.score,
    missingKeywords: parsed.missingKeywords ?? [],
    feedback: parsed.feedback ?? "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      profile,
      jobDescription,
      domain,
      attempt,
      previousScore,
      previousFeedback,
      missingKeywords,
    } = body as {
      profile: ResumeProfile;
      jobDescription: string;
      domain: string;
      attempt: number;
      previousScore?: number;
      previousFeedback?: string;
      missingKeywords?: string[];
    };

    if (!profile || !jobDescription || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured on server" }, { status: 500 });
    }

    const improvementContext =
      attempt > 1
        ? `
IMPORTANT — This is attempt ${attempt}. Previous ATS score was ${previousScore}/100.
Feedback: ${previousFeedback}
Missing keywords that MUST be naturally incorporated: ${missingKeywords?.join(", ")}
Incorporate all missing keywords naturally and fix identified issues.`
        : "";

    const prompt = `You are an expert resume writer and ATS optimization specialist. Create a highly ATS-optimized resume for a ${domain} role based on the candidate's profile and job description below.

RULES:
- Use exact keywords from the job description naturally throughout
- Make bullet points achievement-oriented with metrics where possible
- Keep summary 3-4 sentences, keyword-rich
- Group skills by category (max 4 categories)
- Include all relevant technologies mentioned in the JD
- Keep language professional and specific
${improvementContext}

Return ONLY a JSON object with this exact schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "website": "string",
  "summary": "string",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string",
      "graduationDate": "string",
      "gpa": "string"
    }
  ],
  "skills": [
    {
      "category": "string",
      "items": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "url": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ]
}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOB DESCRIPTION:
${jobDescription}`;

    const response = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const resumeData = JSON.parse(response.choices[0].message.content || "{}") as ResumeProfile;
    const resumeText = profileToPlainText(resumeData);
    const { score, missingKeywords: stillMissing, feedback } = await scoreResume(
      resumeText,
      jobDescription,
      domain
    );

    return NextResponse.json({ resumeData, score, feedback, missingKeywords: stillMissing });
  } catch (err) {
    console.error("[/api/build-resume] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

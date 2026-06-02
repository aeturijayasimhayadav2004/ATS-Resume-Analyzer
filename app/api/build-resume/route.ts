import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeProfile, ATSResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const prompt = `You are an ATS scanner. Score this resume against the job description. Return ONLY JSON:
{
  "score": number (0-100),
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "extraKeywords": string[],
  "suggestions": string[],
  "feedback": "string (1-2 sentences on what to improve for higher score)"
}
Job Description: ${jobDescription}
Domain: ${domain}
Resume:
${resumeText}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}") as ATSResult & {
    feedback: string;
  };
  return {
    score: result.score,
    missingKeywords: result.missingKeywords ?? [],
    feedback: result.feedback ?? "",
  };
}

export async function POST(req: NextRequest) {
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

  const improvementContext =
    attempt > 1
      ? `
IMPORTANT — This is attempt ${attempt}. Previous ATS score was ${previousScore}/100.
Feedback: ${previousFeedback}
Missing keywords that MUST be naturally incorporated: ${missingKeywords?.join(", ")}
Fix all identified issues and score above 80.`
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const resumeData = JSON.parse(
    response.choices[0].message.content || "{}"
  ) as ResumeProfile;

  const resumeText = profileToPlainText(resumeData);
  const { score, missingKeywords: stillMissing, feedback } = await scoreResume(
    resumeText,
    jobDescription,
    domain
  );

  return NextResponse.json({ resumeData, score, feedback, missingKeywords: stillMissing });
}

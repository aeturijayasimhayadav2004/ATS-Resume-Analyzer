import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ATSResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getGroq() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, resumeContent, jobDescription, domain } = body as {
      type: "review" | "ats";
      resumeContent: { base64?: string; text?: string };
      jobDescription: string;
      domain: string;
    };

    if (!type || !jobDescription || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured on server" }, { status: 500 });
    }

    if (type === "review") {
      const prompt = `You are an experienced HR professional and technical recruiter specializing in ${domain} roles. Review this resume against the following job description and provide:
1. Overall assessment of candidate fit (2-3 paragraphs)
2. Key strengths relevant to the role
3. Experience and skill gaps
4. Overall recommendation (Strong Fit / Good Fit / Needs Work / Not a Fit)
Be specific, professional, and constructive.

Job Description: ${jobDescription}

Resume Content:
${resumeContent.text || "(No text extracted from resume)"}`;

      const response = await getGroq().chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      return NextResponse.json({ review: response.choices[0].message.content || "" });
    }

    if (type === "ats") {
      const prompt = `You are an ATS (Applicant Tracking System) scanner. Analyze this resume against the job description and return ONLY a JSON object in this exact format, no other text:
{
  "score": <number 0-100>,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "extraKeywords": ["string"],
  "suggestions": ["string"]
}
Job Description: ${jobDescription}
Domain: ${domain}

Resume Content:
${resumeContent.text || "(No text extracted from resume)"}`;

      const response = await getGroq().chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const atsResult = JSON.parse(response.choices[0].message.content || "{}") as ATSResult;
      return NextResponse.json({ atsResult });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[/api/analyze] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { ATSResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured on server" }, { status: 500 });
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
${resumeContent.text ? `[TEXT CONTENT]\n${resumeContent.text}` : "[IMAGE CONTENT PROVIDED]"}`;

      const parts: (string | Part)[] = [];
      if (resumeContent.base64) {
        parts.push({ inlineData: { mimeType: "image/png", data: resumeContent.base64 } });
      }
      parts.push(prompt);

      const model = getGemini().getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(parts);
      return NextResponse.json({ review: result.response.text() });
    }

    if (type === "ats") {
      const prompt = `You are an ATS (Applicant Tracking System) scanner. Analyze this resume against the job description and return ONLY a JSON object in this exact format, no other text:
{
  "score": number (0-100),
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "extraKeywords": string[],
  "suggestions": string[]
}
Job Description: ${jobDescription}
Domain: ${domain}

Resume Content:
${resumeContent.text ? `[TEXT CONTENT]\n${resumeContent.text}` : "[IMAGE CONTENT PROVIDED]"}`;

      const parts: (string | Part)[] = [];
      if (resumeContent.base64) {
        parts.push({ inlineData: { mimeType: "image/png", data: resumeContent.base64 } });
      }
      parts.push(prompt);

      const model = getGemini().getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(parts);
      const atsResult = JSON.parse(result.response.text()) as ATSResult;
      return NextResponse.json({ atsResult });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[/api/analyze] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

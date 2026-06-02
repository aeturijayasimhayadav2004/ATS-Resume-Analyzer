import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { ResumeProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, text } = body as { base64?: string; text?: string };

    if (!base64 && !text) {
      return NextResponse.json({ error: "No resume content provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured on server" }, { status: 500 });
    }

    const prompt = `Extract structured information from this resume and return ONLY a JSON object matching this exact schema. Use empty strings or empty arrays for missing fields — never null or undefined.

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "website": "string",
  "summary": "string (professional summary or objective, 2-4 sentences)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "startDate": "string (e.g. Jan 2022)",
      "endDate": "string (e.g. Mar 2024 or Present)",
      "bullets": ["string", "string"]
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
      "category": "string (e.g. Programming Languages, Frameworks, Tools)",
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

Resume content:
${text || "[IMAGE PROVIDED]"}`;

    const parts: (string | Part)[] = [];
    if (base64) {
      parts.push({ inlineData: { mimeType: "image/png", data: base64 } });
    }
    parts.push(prompt);

    const model = getGemini().getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(parts);
    const profile = JSON.parse(result.response.text()) as ResumeProfile;
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[/api/extract-profile] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeProfile } from "@/types";

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
    const { text } = body as { base64?: string; text?: string };

    if (!text) {
      return NextResponse.json({ error: "No resume text provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Groq API key not configured on server" }, { status: 500 });
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
${text}`;

    const response = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const profile = JSON.parse(response.choices[0].message.content || "{}") as ResumeProfile;
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[/api/extract-profile] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

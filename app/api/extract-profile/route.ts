import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { base64, text } = body as { base64?: string; text?: string };

  if (!base64 && !text) {
    return NextResponse.json({ error: "No resume content provided" }, { status: 400 });
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

  const content: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
  if (base64) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${base64}` },
    });
  }

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
  });

  const profile = JSON.parse(response.choices[0].message.content || "{}") as ResumeProfile;
  return NextResponse.json({ profile });
}

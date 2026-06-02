import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ATSResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req: NextRequest) {
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

    const content: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
    if (resumeContent.base64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${resumeContent.base64}` },
      });
    }

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content }],
    });

    return NextResponse.json({ review: response.choices[0].message.content || "" });
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

    const content: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
    if (resumeContent.base64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${resumeContent.base64}` },
      });
    }

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content?.trim() || "{}";
    const atsResult = JSON.parse(text) as ATSResult;
    return NextResponse.json({ atsResult });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

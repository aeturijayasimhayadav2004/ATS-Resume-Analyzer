import OpenAI from "openai";
import { ATSResult } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for demo/client-side use as requested
});

export async function getResumeReview(
  resumeBase64: string,
  jobDescription: string,
  domain: string
): Promise<string> {
  const prompt = `You are an experienced HR professional and technical recruiter specializing in ${domain} roles. Review this resume against the following job description and provide:
1. Overall assessment of candidate fit (2-3 paragraphs)
2. Key strengths relevant to the role
3. Experience and skill gaps
4. Overall recommendation (Strong Fit / Good Fit / Needs Work / Not a Fit)
Be specific, professional, and constructive.
Job Description: ${jobDescription}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${resumeBase64}`,
            },
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content || "No review generated.";
}

export async function getATSScore(
  resumeBase64: string,
  jobDescription: string,
  domain: string
): Promise<ATSResult> {
  const prompt = `You are an ATS (Applicant Tracking System) scanner. Analyze this resume against the job description and return ONLY a JSON object in this exact format, no other text:
{
  "score": number (0-100),
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "extraKeywords": string[],
  "suggestions": string[]
}
Job Description: ${jobDescription}
Domain: ${domain}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${resumeBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0].message.content?.trim() || "{}";

  try {
    return JSON.parse(text) as ATSResult;
  } catch {
    throw new Error("Failed to parse ATS score response from OpenAI. Raw: " + text);
  }
}

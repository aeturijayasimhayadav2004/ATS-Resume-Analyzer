import { GoogleGenerativeAI } from "@google/generative-ai";
import { ATSResult } from "@/types";

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function buildImagePart(base64: string) {
  return {
    inlineData: {
      mimeType: "image/png" as const,
      data: base64,
    },
  };
}

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

  const result = await model.generateContent([buildImagePart(resumeBase64), prompt]);
  return result.response.text();
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

  const result = await model.generateContent([buildImagePart(resumeBase64), prompt]);
  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  try {
    return JSON.parse(json) as ATSResult;
  } catch {
    throw new Error("Failed to parse ATS score response from Gemini. Raw: " + text);
  }
}

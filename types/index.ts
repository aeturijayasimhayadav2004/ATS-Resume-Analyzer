export interface ATSResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  extraKeywords: string[];
  suggestions: string[];
}

export interface Analysis {
  id: string;
  domain: string;
  jobDescriptionPreview: string;
  score: number;
  review: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  extraKeywords: string[];
  suggestions: string[];
  createdAt: Date;
}

export type Domain =
  | "AI/ML Engineer"
  | "Data Scientist"
  | "Software Developer"
  | "Data Engineer"
  | "DevOps Engineer"
  | "Full Stack Developer"
  | "Custom";

export interface AnalyzeFormData {
  jobDescription: string;
  domain: Domain;
  customDomain?: string;
}

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

// Resume builder types

export interface WorkExperience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillGroup[];
  projects?: Project[];
  certifications?: Certification[];
}

export interface BuildResumeResult {
  resumeData: ResumeProfile;
  score: number;
  feedback: string;
  attempt: number;
}

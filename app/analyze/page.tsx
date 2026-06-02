"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  RefreshCw,
  Save,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Image from "next/image";

import { ScoreRing } from "@/components/ScoreRing";
import { ResultTabs } from "@/components/ResultTabs";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { pdfToBase64Image, pdfToThumbnail } from "@/lib/pdfUtils";
import { getResumeReview, getATSScore } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/ocr";
import { saveAnalysis } from "@/lib/db";
import { ATSResult, Domain } from "@/types";

const DOMAINS: Domain[] = [
  "AI/ML Engineer",
  "Data Scientist",
  "Software Developer",
  "Data Engineer",
  "DevOps Engineer",
  "Full Stack Developer",
  "Custom",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  jobDescription: z
    .string()
    .min(100, "Job description must be at least 100 characters"),
  domain: z.enum([
    "AI/ML Engineer",
    "Data Scientist",
    "Software Developer",
    "Data Engineer",
    "DevOps Engineer",
    "Full Stack Developer",
    "Custom",
  ] as const),
  customDomain: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const LOADING_MESSAGES = [
  "Reading your resume...",
  "Comparing with job description...",
  "Running ATS scan...",
  "Calculating score...",
  "Generating suggestions...",
];

interface AnalysisResult {
  review: string;
  atsResult: ATSResult;
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeContent, setResumeContent] = useState<{ base64?: string; text?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { domain: "Software Developer" },
  });

  const selectedDomain = watch("domain");

  // File handling
  const processFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }
    setFile(f);
    try {
      const thumb = await pdfToThumbnail(f);
      setThumbnail(thumb);
    } catch {
      // Thumbnail is optional — don't block on failure
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) processFile(droppedFile);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const removeFile = () => {
    setFile(null);
    setThumbnail(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Loading progress animation
  const animateProgress = () => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step * 18, 90);
      setLoadingProgress(progress);
      setLoadingMsg(LOADING_MESSAGES[Math.min(step - 1, LOADING_MESSAGES.length - 1)]);
      if (step >= 5) clearInterval(interval);
    }, 1200);
    return interval;
  };

  const onSubmit = async (data: FormData) => {
    if (!file) {
      toast.error("Please upload a PDF resume.");
      return;
    }
    const domain =
      data.domain === "Custom" && data.customDomain
        ? data.customDomain
        : data.domain;

    setIsLoading(true);
    setLoadingProgress(5);
    setResult(null);
    const interval = animateProgress();

    try {
      const base64 = await pdfToBase64Image(file);

      setLoadingMsg("Extracting text with OCR...");
      const text = await extractTextFromPDF(file);

      setResumeContent({ base64, text });

      const [review, atsResult] = await Promise.all([
        getResumeReview({ base64, text }, data.jobDescription, domain),
        getATSScore({ base64, text }, data.jobDescription, domain),
      ]);

      clearInterval(interval);
      setLoadingProgress(100);
      setResult({ review, atsResult });
      toast.success("Analysis complete!");
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const jd = watch("jobDescription");
    const domain = watch("domain");
    const resolvedDomain =
      domain === "Custom" && watch("customDomain") ? watch("customDomain")! : domain;

    setIsSaving(true);
    try {
      await saveAnalysis({
        domain: resolvedDomain,
        jobDescriptionPreview: jd.slice(0, 150),
        score: result.atsResult.score,
        review: result.review,
        matchedKeywords: result.atsResult.matchedKeywords,
        missingKeywords: result.atsResult.missingKeywords,
        extraKeywords: result.atsResult.extraKeywords,
        suggestions: result.atsResult.suggestions,
      });
      toast.success("Analysis saved to history!");
    } catch {
      toast.error("Failed to save. Check your Firebase config.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setThumbnail(null);
    setResult(null);
    setResumeContent({});
    setLoadingProgress(0);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Analyze Your Resume
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Upload your resume and paste the job description to get your ATS score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ───── Left panel: Inputs ───── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resume (PDF)
            </label>

            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-gray-50 dark:bg-gray-900"
                }`}
              >
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drop your PDF here, or{" "}
                    <span className="text-indigo-600 dark:text-indigo-400">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    PDF only · Max 5MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            ) : (
              <div className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
                {thumbnail && (
                  <div className="flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={thumbnail}
                      alt="Resume preview"
                      width={64}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-6">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Description
            </label>
            <textarea
              {...register("jobDescription")}
              rows={8}
              placeholder="Paste the job description here..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
            />
            {errors.jobDescription && (
              <p className="mt-1 text-xs text-red-500">{errors.jobDescription.message}</p>
            )}
          </div>

          {/* Domain selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Domain
            </label>
            <div className="relative">
              <select
                {...register("domain")}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {selectedDomain === "Custom" && (
              <input
                {...register("customDomain")}
                type="text"
                placeholder="Enter your domain (e.g. Cybersecurity Analyst)"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {isLoading ? "Analyzing..." : "Analyze Resume"}
          </button>

          {/* Loading progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-400 animate-pulse">{loadingMsg}</p>
            </div>
          )}
        </form>

        {/* ───── Right panel: Results ───── */}
        <div>
          {!result && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 text-center p-8">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Your analysis results will appear here after you submit.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">
                {loadingMsg}
              </p>
            </div>
          )}

          {result && !isLoading && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
              {/* Score ring */}
              <div className="flex justify-center">
                <ScoreRing score={result.atsResult.score} />
              </div>

              {/* Tabs */}
              <ResultTabs review={result.review} atsResult={result.atsResult} />

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Analysis
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-600 text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Builder — shown after analysis */}
      {result && !isLoading && (
        <ResumeBuilder
          resumeContent={resumeContent}
          jobDescription={watch("jobDescription")}
          domain={
            watch("domain") === "Custom" && watch("customDomain")
              ? watch("customDomain")!
              : watch("domain")
          }
        />
      )}
    </div>
  );
}

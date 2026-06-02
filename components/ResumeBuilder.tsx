"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import dynamic from "next/dynamic";

import { ResumeForm } from "@/components/ResumeForm";
import { AgentProgress, AgentAttempt } from "@/components/AgentProgress";
import { ResumeProfile } from "@/types";

const ResumePDFDownload = dynamic(
  () => import("@/components/ResumePDF").then((m) => m.ResumePDFDownload),
  { ssr: false, loading: () => null }
);

const MAX_ATTEMPTS = 3;
const TARGET_SCORE = 80;

type Stage =
  | "idle"
  | "extracting"
  | "editing"
  | "building"
  | "complete";

interface ResumeBuilderProps {
  resumeContent: { base64?: string; text?: string };
  jobDescription: string;
  domain: string;
}

export function ResumeBuilder({ resumeContent, jobDescription, domain }: ResumeBuilderProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [agentAttempts, setAgentAttempts] = useState<AgentAttempt[]>([]);
  const [finalResult, setFinalResult] = useState<{
    resumeData: ResumeProfile;
    score: number;
    totalAttempts: number;
  } | null>(null);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    if (stage !== "idle") return;

    setStage("extracting");
    try {
      const res = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: resumeContent.base64, text: resumeContent.text }),
      });
      if (!res.ok) throw new Error("Failed to extract profile");
      const data = await res.json();
      setProfile(data.profile as ResumeProfile);
      setStage("editing");
    } catch {
      toast.error("Could not extract resume data. Please fill in the form manually.");
      setProfile(emptyProfile());
      setStage("editing");
    }
  }, [stage, resumeContent]);

  const runAgentLoop = useCallback(
    async (confirmedProfile: ResumeProfile) => {
      setStage("building");
      setAgentAttempts([]);

      let bestResult: { resumeData: ResumeProfile; score: number } | null = null;
      let previousScore: number | undefined;
      let previousFeedback: string | undefined;
      let missingKeywords: string[] | undefined;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setAgentAttempts((prev) => [
          ...prev,
          {
            attempt,
            status: "running",
            message:
              attempt === 1
                ? "Generating ATS-optimized resume..."
                : `Improving — previous score was ${previousScore}%...`,
          },
        ]);

        try {
          const res = await fetch("/api/build-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: confirmedProfile,
              jobDescription,
              domain,
              attempt,
              previousScore,
              previousFeedback,
              missingKeywords,
            }),
          });

          if (!res.ok) throw new Error("Build failed");
          const data = await res.json() as {
            resumeData: ResumeProfile;
            score: number;
            feedback: string;
            missingKeywords: string[];
          };

          setAgentAttempts((prev) =>
            prev.map((a) =>
              a.attempt === attempt
                ? {
                    ...a,
                    status: "done",
                    score: data.score,
                    message:
                      data.score >= TARGET_SCORE
                        ? "Target reached! Resume is ATS-ready."
                        : attempt < MAX_ATTEMPTS
                        ? `Score ${data.score}% — optimizing further...`
                        : `Final score: ${data.score}% — delivering best version.`,
                  }
                : a
            )
          );

          if (!bestResult || data.score > bestResult.score) {
            bestResult = { resumeData: data.resumeData, score: data.score };
          }

          previousScore = data.score;
          previousFeedback = data.feedback;
          missingKeywords = data.missingKeywords;

          if (data.score >= TARGET_SCORE) break;
        } catch (err) {
          setAgentAttempts((prev) =>
            prev.map((a) =>
              a.attempt === attempt
                ? { ...a, status: "failed", message: "Attempt failed — retrying..." }
                : a
            )
          );
        }
      }

      if (bestResult) {
        setFinalResult({
          resumeData: bestResult.resumeData,
          score: bestResult.score,
          totalAttempts: agentAttempts.length || MAX_ATTEMPTS,
        });
        setStage("complete");
        toast.success(`Resume built! ATS Score: ${bestResult.score}%`);
      } else {
        toast.error("Could not build resume. Please try again.");
        setStage("editing");
      }
    },
    [jobDescription, domain, agentAttempts.length]
  );

  const handleRebuild = () => {
    setStage("editing");
    setAgentAttempts([]);
    setFinalResult(null);
  };

  return (
    <div className="mt-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
      >
        <div className="flex items-center gap-3">
          <Wand2 className="w-5 h-5" />
          <div className="text-left">
            <p className="font-semibold text-sm">Build an ATS-Optimized Resume</p>
            <p className="text-xs text-indigo-200">
              AI agent designs, scores, and refines your resume until it hits 80%+
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {open && (
        <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
          {/* Extracting */}
          {stage === "extracting" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                Extracting your profile from resume...
              </p>
            </div>
          )}

          {/* Editing */}
          {stage === "editing" && profile && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Review and edit your extracted profile, then click{" "}
                <strong>Build My ATS-Optimized Resume</strong>. The AI agent will create a
                tailored resume and keep improving it until the ATS score reaches 80%+.
              </p>
              <ResumeForm
                initial={profile}
                onSubmit={runAgentLoop}
              />
            </div>
          )}

          {/* Building */}
          {stage === "building" && (
            <AgentProgress attempts={agentAttempts} maxAttempts={MAX_ATTEMPTS} />
          )}

          {/* Complete */}
          {stage === "complete" && finalResult && (
            <div className="space-y-4">
              <ResumePDFDownload
                data={finalResult.resumeData}
                score={finalResult.score}
                attempts={finalResult.totalAttempts}
              />
              <button
                onClick={handleRebuild}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400 text-sm transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                Rebuild with different profile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function emptyProfile(): ResumeProfile {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

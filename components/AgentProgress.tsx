"use client";

import { CheckCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";

export interface AgentAttempt {
  attempt: number;
  status: "running" | "done" | "failed";
  score?: number;
  message: string;
}

interface AgentProgressProps {
  attempts: AgentAttempt[];
  maxAttempts: number;
}

export function AgentProgress({ attempts, maxAttempts }: AgentProgressProps) {
  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          AI Agent Building Your Resume
        </h3>
      </div>

      <div className="space-y-3">
        {Array.from({ length: maxAttempts }, (_, i) => i + 1).map((n) => {
          const attempt = attempts.find((a) => a.attempt === n);
          const isPending = !attempt;
          const isRunning = attempt?.status === "running";
          const isDone = attempt?.status === "done";

          return (
            <div key={n} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {isPending ? (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                ) : isRunning ? (
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                ) : isDone && (attempt.score ?? 0) >= 80 ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : isDone ? (
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isPending
                        ? "text-gray-400 dark:text-gray-600"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    Attempt {n} of {maxAttempts}
                  </span>
                  {attempt?.score !== undefined && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        attempt.score >= 80
                          ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
                          : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {attempt.score}% ATS
                    </span>
                  )}
                </div>
                {attempt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {attempt.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800">
        <p className="text-xs text-indigo-600 dark:text-indigo-400 text-center">
          Agent targets ATS score ≥ 80 — redesigns automatically if needed
        </p>
      </div>
    </div>
  );
}

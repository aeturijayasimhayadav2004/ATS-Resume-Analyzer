"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronUp, Clock, History, Loader2 } from "lucide-react";
import { getAnalyses, deleteAnalysis } from "@/lib/db";
import { Analysis } from "@/types";
import { ScoreRing } from "@/components/ScoreRing";
import { ResultTabs } from "@/components/ResultTabs";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
      : score >= 50
      ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
      : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score}% Match
    </span>
  );
}

function AnalysisCard({
  analysis,
  onDelete,
}: {
  analysis: Analysis;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this analysis?")) return;
    setDeleting(true);
    try {
      await onDelete(analysis.id);
      toast.success("Analysis deleted.");
    } catch {
      toast.error("Failed to delete.");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Card header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {analysis.domain}
            </span>
            <ScoreBadge score={analysis.score} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {analysis.createdAt.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {analysis.jobDescriptionPreview}...
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Delete"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-5 space-y-6">
          <div className="flex justify-center">
            <ScoreRing score={analysis.score} size={140} />
          </div>
          <ResultTabs
            review={analysis.review}
            atsResult={{
              score: analysis.score,
              matchedKeywords: analysis.matchedKeywords,
              missingKeywords: analysis.missingKeywords,
              extraKeywords: analysis.extraKeywords ?? [],
              suggestions: analysis.suggestions,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyses()
      .then(setAnalyses)
      .catch((e) => setError(e.message ?? "Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await deleteAnalysis(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-7 h-7 text-indigo-500" />
          Analysis History
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your past resume analyses stored securely.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading history...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && analyses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <History className="w-12 h-12 text-gray-300 dark:text-gray-700" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No analyses yet. Start by analyzing your resume.
          </p>
        </div>
      )}

      {!loading && analyses.length > 0 && (
        <div className="space-y-4">
          {analyses.map((a) => (
            <AnalysisCard key={a.id} analysis={a} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

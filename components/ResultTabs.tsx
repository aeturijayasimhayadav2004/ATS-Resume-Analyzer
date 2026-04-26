"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Lightbulb, FileText } from "lucide-react";
import { ATSResult } from "@/types";

interface ResultTabsProps {
  review: string;
  atsResult: ATSResult;
}

type Tab = "review" | "keywords" | "suggestions";

export function ResultTabs({ review, atsResult }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("review");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "review", label: "Review", icon: FileText },
    { id: "keywords", label: "Keywords", icon: CheckCircle },
    { id: "suggestions", label: "Suggestions", icon: Lightbulb },
  ];

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "review" && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
          {review}
        </div>
      )}

      {activeTab === "keywords" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Matched */}
          <div>
            <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Matched ({atsResult.matchedKeywords.length})
            </h4>
            <ul className="space-y-1.5">
              {atsResult.matchedKeywords.length === 0 && (
                <li className="text-xs text-gray-400">None found</li>
              )}
              {atsResult.matchedKeywords.map((kw) => (
                <li
                  key={kw}
                  className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg px-3 py-1.5 border border-green-200 dark:border-green-900"
                >
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {kw}
                </li>
              ))}
            </ul>
          </div>

          {/* Missing */}
          <div>
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              Missing ({atsResult.missingKeywords.length})
            </h4>
            <ul className="space-y-1.5">
              {atsResult.missingKeywords.length === 0 && (
                <li className="text-xs text-gray-400">None — great job!</li>
              )}
              {atsResult.missingKeywords.map((kw) => (
                <li
                  key={kw}
                  className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-lg px-3 py-1.5 border border-red-200 dark:border-red-900"
                >
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {kw}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === "suggestions" && (
        <ol className="space-y-3">
          {atsResult.suggestions.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

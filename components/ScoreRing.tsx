"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
}

function getColor(score: number) {
  if (score >= 75) return { stroke: "#22c55e", text: "text-green-500", label: "Strong Match" };
  if (score >= 50) return { stroke: "#eab308", text: "text-yellow-500", label: "Moderate Match" };
  return { stroke: "#ef4444", text: "text-red-500", label: "Weak Match" };
}

export function ScoreRing({ score, size = 160 }: ScoreRingProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { stroke, text, label } = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${text}`}>{score}%</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ATS Match</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${text}`}>{label}</span>
    </div>
  );
}

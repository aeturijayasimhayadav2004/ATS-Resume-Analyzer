import Link from "next/link";
import { ArrowRight, Target, Search, Lightbulb, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "ATS Score",
    description:
      "Get an instant percentage match showing how well your resume aligns with the job posting.",
    color: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Search,
    title: "Missing Keywords",
    description:
      "Pinpoint the exact keywords recruiters and ATS systems are scanning for — and add them.",
    color: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Lightbulb,
    title: "Smart Suggestions",
    description:
      "Receive actionable, role-specific tips to improve your resume and stand out from the crowd.",
    color: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
  },
];

const steps = [
  { number: "01", text: "Upload your PDF resume" },
  { number: "02", text: "Paste the job description" },
  { number: "03", text: "Select your target domain" },
  { number: "04", text: "Get your ATS score instantly" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.15),transparent)]"
        />

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 mb-8 border border-indigo-200 dark:border-indigo-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Powered by GPT-4o
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            Know your resume score{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              before the recruiter does.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered ATS analysis against any job description. Instant results.
            No account required.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Analyze My Resume
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-base transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-12">
            Everything you need to beat the ATS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-12">
            Four steps to a better resume
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  {s.number}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                  {s.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

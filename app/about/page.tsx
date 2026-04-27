import Link from "next/link";
import {
  Upload,
  Brain,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Resume",
    description:
      "Drag and drop your PDF resume. We convert the first page to an image and send it securely to Google Gemini Vision.",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description:
      "Gemini 1.5 Flash reads your resume and the job description simultaneously, understanding context, skills, and domain requirements.",
  },
  {
    icon: BarChart3,
    title: "Get Your Score",
    description:
      "Receive a detailed ATS match percentage, matched/missing keywords, a professional review, and targeted improvement suggestions.",
  },
];

const faqs = [
  {
    q: "Is my resume stored anywhere?",
    a: "No. Your resume file is processed in-browser and sent directly to the Gemini API. It is never stored on our servers. Analysis results are only saved to Firestore if you explicitly click 'Save Analysis'.",
  },
  {
    q: "How accurate is the ATS score?",
    a: "The score is an AI estimate of keyword alignment and contextual fit — not a real ATS system output. Different employers use different ATS software. Use the score as a directional guide, not an absolute number.",
  },
  {
    q: "What domains are supported?",
    a: "AI/ML Engineer, Data Scientist, Software Developer, Data Engineer, DevOps Engineer, Full Stack Developer — and a custom option for any other role.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. ResumeIQ is fully anonymous. No sign-up, no login, no email required.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          How ResumeIQ Works
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
          ResumeIQ uses Google Gemini&apos;s multimodal AI to analyze your resume
          against any job description and give you actionable feedback — instantly.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <div className="absolute top-5 right-5 text-2xl font-bold text-gray-100 dark:text-gray-800 select-none">
                0{i + 1}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
        {[
          { icon: Zap, title: "Instant", text: "Results in under 30 seconds." },
          { icon: Shield, title: "Private", text: "No resume storage. Ever." },
          { icon: Globe, title: "Free", text: "No account. No paywall." },
        ].map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.title}
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.title}</p>
                <p className="text-xs text-gray-400">{v.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {faq.q}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center rounded-2xl bg-indigo-600 p-10">
        <h2 className="text-2xl font-bold text-white mb-2">Ready to check your score?</h2>
        <p className="text-indigo-200 mb-6 text-sm">
          Upload your resume and get results in seconds.
        </p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors"
        >
          Analyze My Resume
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

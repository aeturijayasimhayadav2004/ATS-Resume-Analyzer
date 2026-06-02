"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ResumeProfile, WorkExperience, Education, SkillGroup, Project } from "@/types";

const input =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

const label = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm font-semibold text-gray-800 dark:text-gray-200"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

interface ResumeFormProps {
  initial: ResumeProfile;
  onSubmit: (profile: ResumeProfile) => void;
  disabled?: boolean;
}

export function ResumeForm({ initial, onSubmit, disabled }: ResumeFormProps) {
  const [profile, setProfile] = useState<ResumeProfile>(initial);

  const set = <K extends keyof ResumeProfile>(key: K, value: ResumeProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Experience helpers
  const updateExp = (i: number, field: keyof WorkExperience, value: string | string[]) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[i] = { ...exp[i], [field]: value };
      return { ...p, experience: exp };
    });

  const addExp = () =>
    setProfile((p) => ({
      ...p,
      experience: [
        ...p.experience,
        { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [""] },
      ],
    }));

  const removeExp = (i: number) =>
    setProfile((p) => ({ ...p, experience: p.experience.filter((_, j) => j !== i) }));

  const updateBullet = (expIdx: number, bulletIdx: number, value: string) =>
    setProfile((p) => {
      const exp = [...p.experience];
      const bullets = [...exp[expIdx].bullets];
      bullets[bulletIdx] = value;
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...p, experience: exp };
    });

  const addBullet = (expIdx: number) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[expIdx] = { ...exp[expIdx], bullets: [...exp[expIdx].bullets, ""] };
      return { ...p, experience: exp };
    });

  const removeBullet = (expIdx: number, bulletIdx: number) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[expIdx] = {
        ...exp[expIdx],
        bullets: exp[expIdx].bullets.filter((_, j) => j !== bulletIdx),
      };
      return { ...p, experience: exp };
    });

  // Education helpers
  const updateEdu = (i: number, field: keyof Education, value: string) =>
    setProfile((p) => {
      const education = [...p.education];
      education[i] = { ...education[i], [field]: value };
      return { ...p, education };
    });

  const addEdu = () =>
    setProfile((p) => ({
      ...p,
      education: [
        ...p.education,
        { degree: "", institution: "", location: "", graduationDate: "", gpa: "" },
      ],
    }));

  const removeEdu = (i: number) =>
    setProfile((p) => ({ ...p, education: p.education.filter((_, j) => j !== i) }));

  // Skills helpers
  const updateSkillGroup = (i: number, field: keyof SkillGroup, value: string | string[]) =>
    setProfile((p) => {
      const skills = [...p.skills];
      skills[i] = { ...skills[i], [field]: value };
      return { ...p, skills };
    });

  const addSkillGroup = () =>
    setProfile((p) => ({ ...p, skills: [...p.skills, { category: "", items: [] }] }));

  const removeSkillGroup = (i: number) =>
    setProfile((p) => ({ ...p, skills: p.skills.filter((_, j) => j !== i) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(profile);
      }}
      className="space-y-4"
    >
      {/* Contact Info */}
      <CollapsibleSection title="Contact Information" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["name", "email", "phone", "location", "linkedin", "github", "website"] as const).map(
            (field) => (
              <div key={field}>
                <label className={label}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  className={input}
                  value={(profile[field] as string) || ""}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder={field}
                />
              </div>
            )
          )}
        </div>
      </CollapsibleSection>

      {/* Summary */}
      <CollapsibleSection title="Professional Summary" defaultOpen>
        <textarea
          className={input}
          rows={4}
          value={profile.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="Write a professional summary..."
        />
      </CollapsibleSection>

      {/* Experience */}
      <CollapsibleSection title={`Experience (${profile.experience.length})`} defaultOpen>
        {profile.experience.map((exp, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500">Position {i + 1}</span>
              <button
                type="button"
                onClick={() => removeExp(i)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["title", "company", "location", "startDate", "endDate"] as const).map((f) => (
                <div key={f}>
                  <label className={label}>{f}</label>
                  <input
                    className={input}
                    value={exp[f]}
                    onChange={(e) => updateExp(i, f, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className={label}>Bullet Points</label>
              {exp.bullets.map((b, j) => (
                <div key={j} className="flex gap-2">
                  <input
                    className={input}
                    value={b}
                    onChange={(e) => updateBullet(i, j, e.target.value)}
                    placeholder="Achievement or responsibility..."
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(i, j)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addBullet(i)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add bullet
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addExp}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Plus className="w-4 h-4" /> Add position
        </button>
      </CollapsibleSection>

      {/* Education */}
      <CollapsibleSection title={`Education (${profile.education.length})`}>
        {profile.education.map((edu, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500">Entry {i + 1}</span>
              <button
                type="button"
                onClick={() => removeEdu(i)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["degree", "institution", "location", "graduationDate", "gpa"] as const).map((f) => (
                <div key={f}>
                  <label className={label}>{f}</label>
                  <input
                    className={input}
                    value={edu[f] || ""}
                    onChange={(e) => updateEdu(i, f, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addEdu}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Plus className="w-4 h-4" /> Add education
        </button>
      </CollapsibleSection>

      {/* Skills */}
      <CollapsibleSection title={`Skills (${profile.skills.length} groups)`} defaultOpen>
        {profile.skills.map((sg, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Group {i + 1}</span>
              <button
                type="button"
                onClick={() => removeSkillGroup(i)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className={label}>Category name</label>
              <input
                className={input}
                value={sg.category}
                onChange={(e) => updateSkillGroup(i, "category", e.target.value)}
                placeholder="e.g. Programming Languages"
              />
            </div>
            <div>
              <label className={label}>Skills (comma-separated)</label>
              <input
                className={input}
                value={sg.items.join(", ")}
                onChange={(e) =>
                  updateSkillGroup(
                    i,
                    "items",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Python, TypeScript, React..."
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addSkillGroup}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Plus className="w-4 h-4" /> Add skill group
        </button>
      </CollapsibleSection>

      <button
        type="submit"
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20"
      >
        Build My ATS-Optimized Resume
      </button>
    </form>
  );
}

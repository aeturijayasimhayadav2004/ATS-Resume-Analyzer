"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from "@react-pdf/renderer";
import { ResumeProfile } from "@/types";
import { Download, Loader2 } from "lucide-react";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const c = {
  black: "#111111",
  gray: "#444444",
  light: "#777777",
  accent: "#2563EB",
  border: "#DDDDDD",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: c.black,
    padding: "28pt 40pt",
    lineHeight: 1.3,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 3 },
  contact: { fontSize: 8.5, color: c.gray, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  contactItem: { marginRight: 10 },
  divider: { borderBottom: `1pt solid ${c.border}`, marginVertical: 4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: c.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
    marginTop: 9,
  },
  body: { fontSize: 9.5, color: c.gray, lineHeight: 1.4 },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bullet: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 10, color: c.gray },
  bulletText: { flex: 1, color: c.gray, fontSize: 9, lineHeight: 1.35 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 3 },
  skillTag: {
    backgroundColor: "#EFF6FF",
    color: c.accent,
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  light: { color: c.light, fontSize: 8.5 },
});

function Section({ title }: { title: string }) {
  return (
    <>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.divider} />
    </>
  );
}

function ResumeDocument({ data }: { data: ResumeProfile }) {
  const contacts = [
    data.email,
    data.phone,
    data.location,
    data.linkedin,
    data.github,
    data.website,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.name}>{data.name}</Text>
        <View style={s.contact}>
          {contacts.map((c, i) => (
            <Text key={i} style={s.contactItem}>
              {c}
            </Text>
          ))}
        </View>
        <View style={s.divider} />

        {/* Summary */}
        {data.summary ? (
          <>
            <Section title="Professional Summary" />
            <Text style={s.body}>{data.summary}</Text>
          </>
        ) : null}

        {/* Experience */}
        {data.experience.length > 0 ? (
          <>
            <Section title="Experience" />
            {data.experience.map((exp, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={s.row}>
                  <Text style={[s.bold, { fontSize: 10.5 }]}>{exp.title}</Text>
                  <Text style={s.light}>
                    {exp.startDate} – {exp.endDate}
                  </Text>
                </View>
                <Text style={[s.light, { marginBottom: 4 }]}>
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ""}
                </Text>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {/* Education */}
        {data.education.length > 0 ? (
          <>
            <Section title="Education" />
            {data.education.map((edu, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={s.row}>
                  <Text style={[s.bold, { fontSize: 10.5 }]}>{edu.degree}</Text>
                  <Text style={s.light}>{edu.graduationDate}</Text>
                </View>
                <Text style={s.light}>
                  {edu.institution}
                  {edu.location ? ` · ${edu.location}` : ""}
                  {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Skills */}
        {data.skills.length > 0 ? (
          <>
            <Section title="Skills" />
            {data.skills.map((sg, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <Text style={[s.bold, { fontSize: 9, marginBottom: 2 }]}>{sg.category}</Text>
                <View style={s.skillRow}>
                  {sg.items.map((item, j) => (
                    <Text key={j} style={s.skillTag}>
                      {item}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {/* Projects */}
        {data.projects && data.projects.length > 0 ? (
          <>
            <Section title="Projects" />
            {data.projects.map((p, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={s.row}>
                  <Text style={[s.bold, { fontSize: 10.5 }]}>{p.name}</Text>
                  {p.url ? <Text style={s.light}>{p.url}</Text> : null}
                </View>
                <Text style={[s.body, { marginBottom: 3 }]}>{p.description}</Text>
                <Text style={s.light}>Technologies: {p.technologies.join(", ")}</Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 ? (
          <>
            <Section title="Certifications" />
            {data.certifications.map((cert, i) => (
              <View key={i} style={s.row}>
                <Text style={s.body}>
                  {cert.name} · {cert.issuer}
                </Text>
                <Text style={s.light}>{cert.date}</Text>
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

const previewBase: React.CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "9.5pt",
  color: "#111",
  lineHeight: 1.35,
  background: "#fff",
  padding: "28px 40px",
  width: "100%",
  boxSizing: "border-box",
};

function SectionHeading({ title }: { title: string }) {
  return (
    <>
      <div style={{ fontSize: "9.5pt", fontWeight: 700, color: "#2563EB", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginTop: 10, marginBottom: 2 }}>{title}</div>
      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 5px" }} />
    </>
  );
}

function TwoColRow({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={{ padding: 0, verticalAlign: "top" }}>{left}</td>
          {right && (
            <td style={{ padding: 0, verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap", width: 110, color: "#777", fontSize: "8.5pt" }}>
              {right}
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

function ResumeHTMLPreview({ data }: { data: ResumeProfile }) {
  const contacts = [data.email, data.phone, data.location, data.linkedin, data.github, data.website].filter(Boolean);

  return (
    <div style={previewBase}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: "20pt", fontWeight: 700, letterSpacing: "-0.3px" }}>{data.name}</div>
        <div style={{ fontSize: "8.5pt", color: "#555", marginTop: 3 }}>
          {contacts.join(" | ")}
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "5px 0 0" }} />
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 2 }}>
          <SectionHeading title="Professional Summary" />
          <div style={{ fontSize: "9.5pt", color: "#333" }}>{data.summary}</div>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div>
          <SectionHeading title="Experience" />
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <TwoColRow
                left={<span style={{ fontWeight: 700, fontSize: "10pt" }}>{exp.title}</span>}
                right={`${exp.startDate} – ${exp.endDate}`}
              />
              <div style={{ color: "#666", fontSize: "8.5pt", marginBottom: 3 }}>
                {exp.company}{exp.location ? ` · ${exp.location}` : ""}
              </div>
              {exp.bullets.map((b, j) => (
                <div key={j} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <span style={{ flexShrink: 0, color: "#444", fontSize: "9pt" }}>•</span>
                  <span style={{ fontSize: "9pt", color: "#333", lineHeight: 1.4 }}>{b}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div>
          <SectionHeading title="Education" />
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              <TwoColRow
                left={<span style={{ fontWeight: 700, fontSize: "10pt" }}>{edu.degree}</span>}
                right={edu.graduationDate}
              />
              <div style={{ color: "#666", fontSize: "8.5pt" }}>
                {edu.institution}{edu.location ? ` · ${edu.location}` : ""}{edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div>
          <SectionHeading title="Skills" />
          {data.skills.map((sg, i) => (
            <div key={i} style={{ fontSize: "9pt", marginBottom: 3 }}>
              <span style={{ fontWeight: 700 }}>{sg.category}:</span>{" "}
              <span style={{ color: "#333" }}>{sg.items.join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div>
          <SectionHeading title="Projects" />
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 5 }}>
              <TwoColRow
                left={<span style={{ fontWeight: 700, fontSize: "10pt" }}>{p.name}</span>}
                right={p.url || undefined}
              />
              <div style={{ fontSize: "9pt", color: "#333", marginBottom: 2 }}>{p.description}</div>
              <div style={{ fontSize: "8.5pt", color: "#666" }}>
                <span style={{ fontWeight: 700 }}>Tech:</span> {p.technologies.join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div>
          <SectionHeading title="Certifications" />
          {data.certifications.map((cert, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <TwoColRow
                left={<span style={{ fontSize: "9.5pt", color: "#333" }}>{cert.name} · {cert.issuer}</span>}
                right={cert.date}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ResumePDFDownloadProps {
  data: ResumeProfile;
  score: number;
  attempts: number;
}

export function ResumePDFDownload({ data, score, attempts }: ResumePDFDownloadProps) {
  const fileName = `${data.name.replace(/\s+/g, "_")}_ATS_Resume.pdf`;

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Resume Ready!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ATS Score: <span className="font-semibold text-green-600 dark:text-green-400">{score}%</span>
            {" · "}Built in {attempts} {attempts === 1 ? "attempt" : "attempts"}
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{score}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resume Preview</span>
        </div>
        <div className="overflow-y-auto max-h-[600px] bg-white">
          <ResumeHTMLPreview data={data} />
        </div>
      </div>

      {/* Download */}
      <PDFDownloadLink document={<ResumeDocument data={data} />} fileName={fileName}>
        {({ loading }) => (
          <button
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? "Generating PDF..." : "Download ATS-Optimized Resume (PDF)"}
          </button>
        )}
      </PDFDownloadLink>
    </div>
  );
}

"use client";

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
    fontSize: 10,
    color: c.black,
    padding: "36pt 48pt",
    lineHeight: 1.4,
  },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", color: c.black, marginBottom: 4 },
  contact: { fontSize: 9, color: c.gray, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  contactItem: { marginRight: 12 },
  divider: { borderBottom: `1pt solid ${c.border}`, marginVertical: 8 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: c.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
  },
  body: { fontSize: 10, color: c.gray, lineHeight: 1.5 },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, color: c.gray },
  bulletText: { flex: 1, color: c.gray, fontSize: 9.5, lineHeight: 1.45 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  skillTag: {
    backgroundColor: "#EFF6FF",
    color: c.accent,
    fontSize: 8.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  light: { color: c.light, fontSize: 9 },
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
              <View key={i} style={{ marginBottom: 10 }}>
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
              <View key={i} style={{ marginBottom: 8 }}>
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
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={[s.bold, { fontSize: 9.5, marginBottom: 3 }]}>{sg.category}</Text>
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
              <View key={i} style={{ marginBottom: 8 }}>
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

interface ResumePDFDownloadProps {
  data: ResumeProfile;
  score: number;
  attempts: number;
}

export function ResumePDFDownload({ data, score, attempts }: ResumePDFDownloadProps) {
  const fileName = `${data.name.replace(/\s+/g, "_")}_ATS_Resume.pdf`;

  return (
    <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Resume Ready!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ATS Score: <span className="font-semibold text-green-600 dark:text-green-400">{score}%</span>
            {" · "}
            Built in {attempts} {attempts === 1 ? "attempt" : "attempts"}
          </p>
        </div>
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <span className="text-xl font-bold text-green-600 dark:text-green-400">{score}</span>
        </div>
      </div>

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
            {loading ? "Generating PDF..." : "Download ATS-Optimized Resume"}
          </button>
        )}
      </PDFDownloadLink>
    </div>
  );
}

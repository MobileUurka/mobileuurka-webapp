import React from "react";
import { IoArrowBackOutline } from "react-icons/io5";

interface DocumentProps {
  document: any;
  title?: string;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Key → readable label: camelCase / snake_case only. No mapping table.
// ---------------------------------------------------------------------------
const cleanKey = (key: string): string =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ---------------------------------------------------------------------------
// Attach unit where inferable from key
// ---------------------------------------------------------------------------
const withUnit = (value: string, key: string): string => {
  const k = key.toLowerCase().replace(/[^a-z]/g, "");
  if (isNaN(parseFloat(value))) return value;
  const map: [string[], string][] = [
    [["height"], "cm"],
    [["weight"], "kg"],
    [["temperature"], "°C"],
    [["gestationweek"], "wks"],
    [["alp", "alt", "ast"], "U/L"],
    [["albumin"], "g/dL"],
    [["bilirubin", "creatinine", "uricacid", "bun", "fbs", "randombloodsugar"], "mg/dL"],
    [["potassium", "sodium", "chloride", "bicarbonate"], "mEq/L"],
    [["hba1c", "ht"], "%"],
    [["haemoglobin", "mchc"], "g/dL"],
    [["wbc"], "/μL"],
    [["rbc"], "M/μL"],
    [["platelets"], "/μL"],
    [["mch"], "pg"],
    [["mcv"], "fL"],
    [["t3"], "ng/dL"],
    [["t4"], "μg/dL"],
    [["tsh"], "mIU/L"],
    [["pulse"], "bpm"],
    [["systolic", "diastolic"], "mmHg"],
  ];
  for (const [keys, unit] of map) {
    if (keys.some((m) => k.includes(m))) return `${value} ${unit}`;
  }
  return value;
};

const displayValue = (raw: any, key: string): string => {
  if (raw === -1 || raw === "-1") return "Unknown";
  if (raw === null || raw === undefined || raw === "") return "—";
  const s = String(raw);
  if (s.toLowerCase() === "true") return "Yes";
  if (s.toLowerCase() === "false") return "No";
  return withUnit(s, key);
};

const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const isBool = (raw: any) =>
  ["yes", "no", "true", "false", "0", "1"].includes(String(raw).toLowerCase().trim());
const isTrue = (raw: any) =>
  ["yes", "true", "1"].includes(String(raw).toLowerCase().trim());

// ---------------------------------------------------------------------------
// Section groupings
// ---------------------------------------------------------------------------
type SectionDef = { name: string; keys: string[] };

const SECTION_MAP: Record<string, SectionDef[]> = {
  triage: [
    { name: "Patient & Visit", keys: ["editor", "date", "patient", "id"] },
    { name: "Vital Signs", keys: ["height", "weight", "bloodpressure", "systolic", "diastolic", "temperature", "pulse", "oxygen", "spo2"] },
    { name: "Notes", keys: [] },
  ],
  lab: [
    { name: "Request", keys: ["editor", "date", "patient", "id", "gestationweek", "diagnosisid"] },
    { name: "Blood Chemistry", keys: ["alp", "alt", "ast", "albumin", "bicarbonate", "bilirubin", "calcium", "chloride", "creatinine", "glutamyl", "potassium", "sodium", "uricacid", "bun"] },
    { name: "Blood Sugar", keys: ["fbs", "fbs1", "fbs2", "hba1c", "randombloodsugar"] },
    { name: "Haematology", keys: ["ht", "haemoglobin", "mch", "mchc", "mcv", "rbc", "wbc", "platelets", "leukocyte"] },
    { name: "Thyroid", keys: ["t3", "t4", "tsh"] },
    { name: "Urinalysis", keys: ["sg", "ph", "urinecolor", "urineglucose", "urinenitrite", "urineodor", "urineprotein", "ketones", "clarity", "urine"] },
  ],
  pregnancy: [
    { name: "Visit", keys: ["editor", "date", "patient", "id", "gestationweek", "sexoffetus", "spe"] },
    { name: "Obstetric Findings", keys: ["doppler", "bleeding", "eclampsia", "edema", "malpresentation", "multifetal", "pprom", "prom", "preeclampsia", "placenta", "primipaternity"] },
    { name: "Comorbidities", keys: ["anemia", "diabetes", "hypertension", "malaria", "hookworm", "vitamind", "severanemia", "highhb"] },
  ],
  infection: [
    { name: "Request", keys: ["editor", "date", "patient", "id"] },
    { name: "Screening Results", keys: [] },
  ],
};

const FALLBACK: SectionDef[] = [
  { name: "Header", keys: ["editor", "date", "patient", "id"] },
  { name: "Details", keys: [] },
];

const getSectionDefs = (title: string): SectionDef[] => {
  const t = title.toLowerCase();
  for (const [k, v] of Object.entries(SECTION_MAP)) {
    if (t.includes(k)) return v;
  }
  return FALLBACK;
};

// ---------------------------------------------------------------------------
// Assign items to sections; last is catch-all
// ---------------------------------------------------------------------------
type Item = { key: string; label: string; display: string; raw: any };

const buildSections = (items: Item[], defs: SectionDef[]) => {
  const used = new Set<string>();
  const out = defs.map((d) => ({ name: d.name, items: [] as Item[] }));

  defs.slice(0, -1).forEach((def, si) => {
    items.forEach((item) => {
      const norm = item.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!used.has(item.key) && def.keys.some((k) => norm.includes(k))) {
        out[si].items.push(item);
        used.add(item.key);
      }
    });
  });

  items.forEach((item) => {
    if (!used.has(item.key)) out[out.length - 1].items.push(item);
  });

  return out.filter((s) => s.items.length > 0);
};

// ---------------------------------------------------------------------------
// Download as .txt
// ---------------------------------------------------------------------------
const downloadTxt = (title: string, sections: { name: string; items: Item[] }[], editor: string, date: string) => {
  const hr = "─".repeat(56);
  const lines = [
    "CONFIDENTIAL MEDICAL DOCUMENT",
    hr,
    `Document  : ${title}`,
    `Recorded  : ${editor}`,
    `Date/Time : ${date}`,
    hr,
  ];
  sections.forEach((sec) => {
    lines.push("", sec.name.toUpperCase());
    sec.items.forEach((item) => {
      lines.push(`  ${item.label.padEnd(28)} ${item.display}`);
    });
  });
  lines.push("", hr, "Confidential — Authorised medical personnel only");

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${title.replace(/\s+/g, "_")}.txt`,
  });
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Document: React.FC<DocumentProps> = ({ document, title = "Medical Document", onBack }) => {
  if (!document) return null;

  const raw = { ...document };
  if (raw.date) raw.date = formatDate(raw.date);
  delete raw.user_id;
  delete raw.infections_id;

  const ordered: Record<string, any> = {};
  if ("editor" in raw) ordered.editor = raw.editor;
  for (const k in raw) if (k !== "editor") ordered[k] = raw[k];

  const items: Item[] = Object.entries(ordered).map(([key, value]) => ({
    key,
    label: cleanKey(key),
    display: displayValue(value, key),
    raw: value,
  }));

  const sections = buildSections(items, getSectionDefs(title));
  const editor = items.find((i) => i.key === "editor")?.display ?? "—";
  const date = items.find((i) => i.key === "date")?.display ?? "—";

  const Pill = ({ val }: { val: any }) => {
    const yes = isTrue(val);
    return (
      <span style={{
        display: "inline-block",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "2px 7px",
        borderRadius: "3px",
        background: yes ? "#fff1f0" : "#f2faf5",
        color: yes ? "#b91c1c" : "#166534",
        border: `1px solid ${yes ? "#fca5a5" : "#86efac"}`,
      }}>
        {yes ? "YES" : "NO"}
      </span>
    );
  };

  const cellStyle = (isLabel: boolean): React.CSSProperties => ({
    width: "25%",
    padding: "8px 16px",
    fontSize: isLabel ? "12px" : "11px",
    color: isLabel ? "#999" : "#111",
    fontWeight: isLabel ? 400 : 400,
    verticalAlign: "middle",
    whiteSpace: isLabel ? "nowrap" : "normal",
  });

  return (
    <div style={{
      width: "100%",
      maxWidth: "820px",
      background: "#fff",
      border: "1px solid #d4d4d4",
      borderRadius: "6px",
      // fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#1a1a1a",
      overflow: "hidden",
      marginBottom: "32px",
    }}>

      {/* Top bar */}
      <div style={{
        background: "#f7f7f7",
        borderBottom: "1px solid #d4d4d4",
        padding: "11px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onBack && (
            <>
              <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: 0, fontFamily: "inherit" }}>
                <IoArrowBackOutline size={13} /> Back
              </button>
              <span style={{ color: "#ccc", fontSize: "11px" }}>|</span>
            </>
          )}
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>
            {title}
          </span>
        </div>
        <button
          onClick={() => downloadTxt(title, sections, editor, date)}
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
            color: "#555",
            padding: "4px 10px",
          }}
        >
          ↓ Download
        </button>
      </div>

      {/* Meta strip */}
      <div style={{
        borderBottom: "1px solid #e8e8e8",
        padding: "10px 18px",
        display: "flex",
        gap: "36px",
        background: "#fcfcfc",
      }}>
        {[{ label: "Recorded by", value: editor }, { label: "Date & time", value: date }].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: "2px" }}>{label}</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#222" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.map((sec, si) => {
        const pairs: [Item, Item | null][] = [];
        for (let i = 0; i < sec.items.length; i += 2) {
          pairs.push([sec.items[i], sec.items[i + 1] ?? null]);
        }

        return (
          <div key={si} style={{ borderBottom: si < sections.length - 1 ? "1px solid #e8e8e8" : "none" }}>
            <div style={{
              padding: "6px 18px",
              background: "#f7f7f7",
              borderBottom: "1px solid #e8e8e8",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#888",
            }}>
              {sec.name}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {pairs.map(([a, b], ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={cellStyle(true)}>{a.label}</td>
                    <td style={{ ...cellStyle(false), borderRight: "1px solid #ebebeb", color: a.display === "—" ? "#d0d0d0" : "#111" }}>
                      {isBool(a.raw) ? <Pill val={a.raw} /> : a.display}
                    </td>
                    {b ? (
                      <>
                        <td style={cellStyle(true)}>{b.label}</td>
                        <td style={{ ...cellStyle(false), color: b.display === "—" ? "#d0d0d0" : "#111" }}>
                          {isBool(b.raw) ? <Pill val={b.raw} /> : b.display}
                        </td>
                      </>
                    ) : (
                      <td colSpan={2} />
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        padding: "7px 18px",
        background: "#f7f7f7",
        borderTop: "1px solid #d4d4d4",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "9px", letterSpacing: "0.06em", color: "#bbb" }}>
          CONFIDENTIAL — AUTHORISED MEDICAL PERSONNEL ONLY
        </span>
        <span style={{ fontSize: "9px", color: "#bbb" }}>{new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default Document;
import React, { useEffect, useState } from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import { HiOutlineDownload } from "react-icons/hi";
import { userService } from "../services/userServices";
import type { PatientData } from "../types/patient";

interface DocumentProps {
  document: any;
  title?: string;
  onBack?: () => void;
  patient?: PatientData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const cleanKey = (key: string): string =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
    : d.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
};

const isBool = (raw: any) =>
  ["yes", "no", "true", "false", "0", "1"].includes(String(raw).toLowerCase().trim());
const isTrue = (raw: any) =>
  ["yes", "true", "1"].includes(String(raw).toLowerCase().trim());

// Strip any field whose key ends with "id" or is exactly "id"
const isIdField = (key: string): boolean => {
  const k = key.toLowerCase().replace(/_/g, "");
  return k === "id" || k.endsWith("id");
};

type Item = { key: string; label: string; display: string; raw: any };

const downloadTxt = (title: string, items: Item[], editor: string, date: string, hospital: string) => {
  const hr = "─".repeat(56);
  const lines = [
    hospital.toUpperCase(),
    "CONFIDENTIAL MEDICAL DOCUMENT",
    hr,
    `Document  : ${title}`,
    `Recorded  : ${editor}`,
    `Date/Time : ${date}`,
    hr,
    "",
  ];
  items.forEach((item) => {
    lines.push(`  ${item.label.padEnd(28)} ${item.display}`);
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
const Document: React.FC<DocumentProps> = ({
  document,
  title = "Medical Document",
  onBack,
  patient,
}) => {
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  // Collect all UUID-like values from editor / patient fields and resolve them
  useEffect(() => {
    if (!document) return;

    const uuidLike = /^[0-9a-f-]{20,}$/i;
    const toResolve: string[] = [];

    for (const [key, value] of Object.entries(document)) {
      if (typeof value === "string" && uuidLike.test(value)) {
        const k = key.toLowerCase();
        if (k === "editor" || k === "patient" || k.endsWith("_id") || k.endsWith("id")) {
          if (!toResolve.includes(value)) toResolve.push(value);
        }
      }
    }

    // Also resolve patient id from patient prop
    if (patient?.id && !toResolve.includes(patient.id)) {
      toResolve.push(patient.id);
    }

    if (toResolve.length === 0) return;

    (async () => {
      const map: Record<string, string> = {};
      for (const uid of toResolve) {
        // If it matches the patient we already have, use their name directly
        if (patient && uid === patient.id) {
          map[uid] = `${patient.firstName} ${patient.lastName}`;
          continue;
        }
        try {
          const res = await userService.getUserById(uid);
          const u = res?.data?.user;
          if (u) map[uid] = `${u.firstName} ${u.lastName}`;
        } catch {
          // leave unresolved
        }
      }
      setResolvedNames(map);
    })();
  }, [document, patient]);

  if (!document) return null;

  const hospitalName = patient?.hospital || "Medical Facility";

  const raw = { ...document };
  if (raw.date) raw.date = formatDate(raw.date);

  // editor first, then everything else — skip all id fields
  const ordered: Record<string, any> = {};
  if ("editor" in raw) ordered.editor = raw.editor;
  for (const k in raw) {
    if (k !== "editor" && !isIdField(k)) ordered[k] = raw[k];
  }

  const items: Item[] = Object.entries(ordered).map(([key, value]) => {
    const rawVal = value;
    // Resolve UUID values to names
    const resolved =
      typeof rawVal === "string" && resolvedNames[rawVal]
        ? resolvedNames[rawVal]
        : null;

    return {
      key,
      label: cleanKey(key),
      display: resolved ?? displayValue(rawVal, key),
      raw: resolved ? resolved : rawVal,
    };
  });

  const editor = items.find((i) => i.key === "editor")?.display ?? "—";
  const date = items.find((i) => i.key === "date")?.display ?? "—";

  // Split into pairs for strict 2-column layout
  const pairs: [Item, Item | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i], items[i + 1] ?? null]);
  }

  const BoolBadge = ({ val }: { val: any }) => {
    const yes = isTrue(val);
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "12px",
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: "20px",
        background: yes ? "#fef2f2" : "#f0fdf4",
        color: yes ? "#dc2626" : "#16a34a",
        border: `1px solid ${yes ? "#fecaca" : "#bbf7d0"}`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: yes ? "#dc2626" : "#16a34a", display: "inline-block" }} />
        {yes ? "Positive" : "Negative"}
      </span>
    );
  };

  return (
    <div style={{
      width: "100%",
      maxWidth: "720px",
      background: "#fff",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      fontFamily: "var(--font-title, 'DM Sans', sans-serif)",
      color: "#111827",
      marginBottom: "32px",
    }}>

      {/* Hospital header */}
      <div style={{
        background: "#008540",
        padding: "16px 24px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "6px",
              cursor: "pointer",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              padding: "4px 10px",
              fontFamily: "inherit",
            }}>
              <IoArrowBackOutline size={13} /> Back
            </button>
          )}
          <div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
              {hospitalName}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
              {title}
            </div>
          </div>
        </div>
        <button
          onClick={() => downloadTxt(title, items, editor, date, hospitalName)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "6px",
            cursor: "pointer",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            padding: "5px 11px",
            fontFamily: "inherit",
          }}
        >
          <HiOutlineDownload size={13} />
          Download
        </button>
      </div>

      {/* Meta strip */}
      <div style={{
        padding: "12px 24px",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        gap: "32px",
        background: "#fafafa",
      }}>
        {[{ label: "Recorded by", value: editor }, { label: "Date & time", value: date }].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Fields — strict 2-column */}
      <div style={{ padding: "8px 0 4px" }}>
        {pairs.map(([a, b], ri) => (
          <div key={ri} style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: ri < pairs.length - 1 ? "1px solid #f3f4f6" : "none",
          }}>
            {[a, b].map((item, ci) =>
              item ? (
                <div key={ci} style={{
                  padding: "12px 24px",
                  borderRight: ci === 0 ? "1px solid #f3f4f6" : "none",
                }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: item.display === "—" ? "#d1d5db" : "#111827" }}>
                    {isBool(item.raw) ? <BoolBadge val={item.raw} /> : item.display}
                  </div>
                </div>
              ) : (
                <div key={ci} />
              )
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 24px",
        borderTop: "1px solid #f3f4f6",
        background: "#fafafa",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "10px", color: "#d1d5db", letterSpacing: "0.04em" }}>
          CONFIDENTIAL — AUTHORISED MEDICAL PERSONNEL ONLY
        </span>
        <span style={{ fontSize: "10px", color: "#d1d5db" }}>{new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default Document;

import React, { useEffect, useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { IoDocumentTextOutline } from "react-icons/io5";
import { IoIosWarning, IoMdAdd } from "react-icons/io";
import { TbBrain } from "react-icons/tb";
// import { LuShieldAlert } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import DataTable from "../components/DataTable";

import { type PatientData, type TabType } from '../types/patient';

interface DocumentsProps {
  patient: PatientData;
  setActiveTitle: (tab: TabType) => void;
  setDocument: (doc: any) => void;
  setDocumentTitle: (title: string) => void;
  document?: any;
  editorNames?: Record<string, string>;
}

// ─── RISK BADGE — same palette as the rest of the app ────────────────────────

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626' },
  HIGH: { bg: '#fff7ed', text: '#ea580c' },
  MODERATE: { bg: '#fefce8', text: '#ca8a04' },
  LOW: { bg: '#f0fdf4', text: '#16a34a' },
};

function RiskBadge({ level }: { level?: string }) {
  const key = (level ?? '').toUpperCase();
  const style = RISK_COLORS[key] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
      background: style.bg, color: style.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.text, display: 'inline-block' }} />
      {key || 'Unknown'}
    </span>
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const Documents: React.FC<DocumentsProps> = ({
  patient,
  setActiveTitle,
  setDocument,
  setDocumentTitle,
  editorNames = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Remove the local editorNames state and useEffect since we're receiving it as a prop

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "N/A") return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  const toMs = (dateString: string) => {
    if (!dateString || dateString === "N/A") return 0;
    const t = new Date(dateString).getTime();
    return isNaN(t) ? 0 : t;
  };

  function formatDiagnosis(raw: string) {
    if (!raw) return "No diagnosis records";

    const isNegativeResult = (s: string) =>
      /^no\b/i.test(s) ||
      /^not\b/i.test(s) ||
      /^none\b/i.test(s) ||
      /no specific conditions/i.test(s) ||
      /no condition/i.test(s) ||
      /not of any/i.test(s);

    const parsePostgresArray = (str: string) =>
      str.replace(/^{|}$/g, "").split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((item) => item.replace(/^"(.*)"$/, "$1").trim());

    const parsed = parsePostgresArray(raw);
    const cleaned = parsed
      .filter((x) => x && x !== "NULL")
      .map((entry) =>
        entry
          .replace(/Highly\s+/i, "")
          .replace(/Suspected to have\s+/i, "")
          .replace(/\.$/, "")
          .trim()
      );

    if (cleaned.length === 0) return "No diagnosis data found";
    if (isNegativeResult(cleaned[0])) return "No specific conditions detected";

    const positive = cleaned.filter((c) => !isNegativeResult(c));
    if (positive.length === 0) return "No specific conditions detected";

    return `Suspected to have ${positive.join(" & ")}`;
  }

  const generateInfectionMessage = (item: any) => {
    const fields: Record<string, string> = {
      hiv: "HIV", syphilis: "Syphilis", hepB: "Hepatitis B", hepC: "Hepatitis C", rubella: "Rubella",
    };
    const positives: string[] = [];
    const negatives: string[] = [];
    for (const key in fields) {
      if (item[key] === "Positive") positives.push(fields[key]);
      else if (item[key] === "Negative") negatives.push(fields[key]);
    }
    if (positives.length > 0)
      return `Positive: ${positives.join(", ")}${negatives.length > 0 ? ` | Negative: ${negatives.join(", ")}` : ""}`;
    return negatives.length > 0 ? `All Negative: ${negatives.join(", ")}` : "No infection data";
  };

  const renderResult = (record: any) => {
    if (record.title === "Pregnancy Journey") {
      const label = record.result?.charAt(0).toUpperCase() + record.result?.slice(1).toLowerCase();
      return <span>{`Risk level is ${label || "Unknown"}`}</span>;
    }
    if (record.title === "Lab Work") return <span>{formatDiagnosis(record.result)}</span>;
    return <span>{record.result}</span>;
  };

  const resolveEditor = (editor: string) => {
    if (!editor) return "System";
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidLike.test(editor)) return editor; // already a name
    return editorNames[editor] ?? "System";
  };

  const buildRecord = (array: any[] | undefined, title: string) =>
    array?.map((item) => {
      let result = "";
      if (title === "Lab Work") result = item.diagnosis || "No diagnosis";
      if (title === "Infections") result = generateInfectionMessage(item);
      if (title === "Pregnancy Journey") {
        // Match explanation by gestationweek + date, then pick closest by updatedAt
        const itemDate = new Date(item.date).toISOString().split("T")[0];
        const itemUpdatedAt = new Date(item.updatedAt || item.date).getTime();

        const match = patient?.explanation
          ?.filter((exp: any) => {
            const expDate = new Date(exp.date).toISOString().split("T")[0];
            return expDate === itemDate && exp.gestationweek === item.gestationweek;
          })
          ?.sort((a: any, b: any) => {
            // Sort by closest updatedAt to the item's updatedAt
            const aDiff = Math.abs(new Date(a.updatedAt || a.date).getTime() - itemUpdatedAt);
            const bDiff = Math.abs(new Date(b.updatedAt || b.date).getTime() - itemUpdatedAt);
            return aDiff - bDiff;
          })?.[0];

        result = match?.risklevel || "No risk level";
      }
      if (title === "Symptom Analysis") {
        result = item.riskLevel ?? item.risk_level ?? "UNKNOWN";
      }
      return {
        title,
        date_of_visit: item.date || item.updatedAt || item.createdAt || item.timestamp || "N/A",
        editor: title === "Symptom Analysis" ? "AI System" : (item.editor || "System"),
        source: item,
        result,
        isSymptomReport: title === "Symptom Analysis",
      };
    }) ?? [];

  // ─── Build + sort all records newest first ─────────────────────────────────

  const allRecords = [
    ...buildRecord(patient?.symptomReasoningReport, "Symptom Analysis"),
    ...buildRecord(patient?.triage, "Triage"),
    ...buildRecord(patient?.labwork, "Lab Work"),
    ...buildRecord(patient?.currentPregnancyInfo, "Pregnancy Journey"),
    ...buildRecord(patient?.infections, "Infections"),
  ].sort((a, b) => toMs(b.date_of_visit) - toMs(a.date_of_visit));

  const filteredRecords = allRecords.filter((record) =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Columns ───────────────────────────────────────────────────────────────

  const documentColumns = [
    {
      label: "Name",
      key: "name",
      width: "220px",
      render: (record: any) => (
        <div className="flex flex-row items-center gap-[15px]">
          {record.isSymptomReport ? (
            // Symptom report — same amber circle as other docs but with brain icon
            <div className="w-10 h-10 rounded-full bg-[#984815]/10 flex justify-center items-center text-[#984815] text-[1.1em] shrink-0">
              <TbBrain size={18} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#ffae1b] flex justify-center items-center text-white text-[1.1em] shrink-0">
              <IoDocumentTextOutline />
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <div className="font-medium text-black truncate">{record.title}</div>
            <div className="text-[0.8em] text-gray-400">
              {record.isSymptomReport ? 'AI-generated report' : 'View Details'}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Editor",
      key: "editor",
      width: "250px",
      render: (record: any) => (
        <div className="text-black/70 truncate">
          {record.isSymptomReport ? 'AI System' : resolveEditor(record.editor)}
        </div>
      ),
    },
    {
      label: "Date",
      key: "date",
      width: "150px",
      render: (record: any) => (
        <div className="text-[#333]">{formatDate(record.date_of_visit)}</div>
      ),
    },
    {
      label: "Analysis",
      key: "analysis",
      width: "350px",
      render: (record: any) => {
        if (record.isSymptomReport) {
          return (
            <div className="flex items-center gap-2">
              {/* <LuShieldAlert size={16} className="text-[#984815] shrink-0" /> */}
              <RiskBadge level={record.result} />
            </div>
          );
        }
        return (
          <div className="flex items-center text-[#838383] overflow-hidden">
            {(record.result !== "" && record.result !== "All Negative" && !record.result.startsWith("All Negative:")) && (
              <IoIosWarning className="shrink-0 mr-2.5 p-[2px] rounded-full text-[#FF9500] bg-[#FF950020]" size={20} />
            )}
            <div className="truncate italic">{renderResult(record)}</div>
          </div>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  const handleAddDocument = () => {
    navigate("/Screening", {
      state: { patientId: patient?.id, returnTo: 'documents', internalTab: 1 },
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-row items-center gap-[15px] mb-5">
        <div className="relative w-3/5 h-[50px] rounded-[11px] border border-[#c6c6c68f] bg-transparent flex items-center px-4">
          <RiSearchLine className="text-[#4f453578] text-lg" />
          <input
            type="search"
            placeholder="Search Document"
            className="w-full h-full border-none outline-none bg-transparent pl-2 text-[15px] placeholder:text-[#4f453578]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handleAddDocument}
          className="h-[50px] px-[25px] rounded-[11px] bg-[#008540] text-white flex items-center justify-center gap-2.5 text-[0.9em] cursor-pointer hover:bg-[#007036] transition-colors"
        >
          <IoMdAdd className="text-xl" />
          Add <span className="hidden md:flex">Document</span>
        </button>
      </div>

      <DataTable
        columns={documentColumns}
        data={filteredRecords}
        onRowClick={(record) => {
          setDocument(record.source);
          setDocumentTitle(record.title);
          setActiveTitle(record.isSymptomReport ? ("symptomReport" as TabType) : ("document" as TabType));
        }}
        emptyMessage={searchTerm ? `No documents found matching "${searchTerm}"` : "No documents found."}
        initialItemsPerPage={5}
      />
    </div>
  );
};

export default Documents;

import React, { useEffect, useState, useRef } from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import { HiOutlineDownload } from "react-icons/hi";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { userService } from "../services/userServices";
import type { PatientData } from "../types/patient";

interface DocumentProps {
  document: any;
  title?: string;
  onBack?: () => void;
  patient?: PatientData;
  editorNames?: Record<string, string>;
}

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
    [["pulse", "heartrate"], "bpm"],
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

const formatDate = (iso: string, format: 'long' | 'short' = 'long'): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";

  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  return d.toLocaleString("en-US", {
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

const isIdField = (key: string): boolean => {
  const k = key.toLowerCase().replace(/_/g, "");
  return k === "id" || k.endsWith("id");
};

const isImageUrlField = (key: string): boolean => {
  const k = key.toLowerCase().replace(/_/g, "");
  return k.includes("imageurl") || k.includes("ultrasoundurl") || k.includes("imagekey");
};

const isUrlValue = (value: any): boolean => {
  if (typeof value !== "string") return false;
  return value.startsWith("http://") || value.startsWith("https://");
};

type Item = { key: string; label: string; display: string; raw: any };

const DocumentNew: React.FC<DocumentProps> = ({
  document,
  title = "Medical Document",
  onBack,
  patient,
  editorNames = {},
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>(editorNames);

  useEffect(() => {
    setResolvedNames(prev => ({ ...prev, ...editorNames }));
  }, [editorNames]);

  useEffect(() => {
    if (!document) return;

    const uuidLike = /^[0-9a-f-]{20,}$/i;
    const toResolve: string[] = [];

    for (const [key, value] of Object.entries(document)) {
      if (typeof value === "string" && uuidLike.test(value)) {
        const k = key.toLowerCase();
        if (k === "editor" || k === "patient") {
          if (!editorNames[value] && !toResolve.includes(value)) {
            toResolve.push(value);
          }
        }
      }
    }

    if (patient?.id && !editorNames[patient.id] && !toResolve.includes(patient.id)) {
      toResolve.push(patient.id);
    }

    if (toResolve.length === 0) return;

    (async () => {
      const map: Record<string, string> = { ...editorNames };
      for (const uid of toResolve) {
        if (patient && uid === patient.id) {
          map[uid] = `${patient.firstName} ${patient.lastName}`;
          continue;
        }
        try {
          const res = await userService.getUserById(uid);
          const u = res?.data?.user;
          if (u) map[uid] = `${u.firstName} ${u.lastName}`;
        } catch { }
      }
      setResolvedNames(map);
    })();
  }, [document, patient, editorNames]);

  if (!document) return null;

  const raw = { ...document };
  if (raw.date) raw.date = formatDate(raw.date);

  const ordered: Record<string, any> = {};
  if ("editor" in raw) ordered.editor = raw.editor;
  for (const k in raw) {
    if (k !== "editor" && !isIdField(k)) ordered[k] = raw[k];
  }

  // Separate image URL fields from regular fields
  const imageFields: { key: string; label: string; url: string }[] = [];
  const regularOrdered: Record<string, any> = {};

  for (const [k, v] of Object.entries(ordered)) {
    if (isImageUrlField(k) && isUrlValue(v)) {
      imageFields.push({ key: k, label: cleanKey(k), url: v as string });
    } else {
      regularOrdered[k] = v;
    }
  }

  const items: Item[] = Object.entries(regularOrdered).map(([key, value]) => {
    const rawVal = value;
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

  const pairs: [Item, Item | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i], items[i + 1] ?? null]);
  }

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    try {
      const patientName = patient?.name?.replace(/\s+/g, ' ').trim() || 'Patient';
      const dateStr = formatDate(document?.date || new Date().toISOString(), 'short').replace(/\//g, '-');
      const filename = `${title} - ${patientName} - ${dateStr}.pdf`;

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const BoolBadge = ({ val }: { val: any }) => {
    const yes = isTrue(val);
    return <span className="text-xs font-medium" style={{ color: '#111827' }}>{yes ? "Positive" : "Negative"}</span>;
  };

  return (
    <>
      {/* Screen-only controls */}
      <div className="print:hidden mb-3 flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <IoArrowBackOutline size={14} />
            Back
          </button>
        )}
        <button
          onClick={handleDownloadPDF}
          className="px-3 py-1.5 bg-[#008540] hover:bg-[#007036] text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <HiOutlineDownload size={14} />
          Download PDF
        </button>
      </div>

      {/* Printable Document */}
      <div
        ref={printRef}
        className="mt-5 w-full max-w-[210mm] p-8 print:p-0 rounded-lg"
        style={{
          fontSize: '11px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          color: '#000000'
        }}
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Mobileuurka" className="w-12 h-12" />
            <div>
              <h1 className="text-base font-bold" style={{ color: '#111827' }}>Mobileuurka</h1>
              <p className="text-xs" style={{ color: '#4b5563' }}>Healthcare Services</p>
            </div>
          </div>
          <div className="mt-4 lg:text-right lg:mt-0">
            <h2 className="text-sm font-bold" style={{ color: '#111827' }}>{title}</h2>
            <p className="text-xs" style={{ color: '#4b5563' }}>Date: {formatDate(document?.date || new Date().toISOString())}</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Patient Information</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>FULL NAME</p>
              <p className="text-xs font-medium" style={{ color: '#111827' }}>{patient?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>PATIENT ID</p>
              <p className="text-xs font-medium" style={{ color: '#111827' }}>{patient?.nationalId || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>RECORDED BY</p>
              <p className="text-xs font-medium" style={{ color: '#111827' }}>{editor}</p>
            </div>
          </div>
        </div>

        {/* Document Data */}
        <div className="mb-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Document Data</h3>
          <div
            className="rounded overflow-hidden"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wide w-[22%]" style={{ color: '#4b5563' }}>Field</th>
                  <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wide w-[28%]" style={{ color: '#4b5563' }}>Value</th>
                  <th className="hidden md:table-cell text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wide w-[22%]" style={{ color: '#4b5563' }}>Field</th>
                  <th className="hidden md:table-cell text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wide w-[28%]" style={{ color: '#4b5563' }}>Value</th>
                </tr>
              </thead>

              <tbody>
                {pairs.map(([item1, item2], index) => (
                  <React.Fragment key={index}>
                    <tr
                      style={{
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                        borderBottom: index === pairs.length - 1 ? 'none' : '1px solid #f3f4f6',
                      }}
                    >
                      <td className="py-2 px-3 font-medium" style={{ color: '#374151' }}>{item1.label}</td>
                      <td className="py-2 px-3" style={{ color: '#111827' }}>
                        {isBool(item1.raw) ? <BoolBadge val={item1.raw} /> : item1.display}
                      </td>
                      {item2 ? (
                        <>
                          <td className="hidden md:table-cell py-2 px-3 font-medium" style={{ color: '#374151', borderLeft: '1px solid #e5e7eb' }}>{item2.label}</td>
                          <td className="hidden md:table-cell py-2 px-3" style={{ color: '#111827' }}>
                            {isBool(item2.raw) ? <BoolBadge val={item2.raw} /> : item2.label === 'Updated At' ? formatDate(item2.display) : item2.display}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="hidden md:table-cell py-2 px-3" style={{ borderLeft: '1px solid #e5e7eb' }}></td>
                          <td className="hidden md:table-cell py-2 px-3"></td>
                        </>
                      )}
                    </tr>

                    {item2 && (
                      <tr
                        className="md:hidden"
                        style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: index === pairs.length - 1 ? 'none' : '1px solid #f3f4f6',
                        }}
                      >
                        <td className="py-2 px-3 font-medium" style={{ color: '#374151' }}>{item2.label}</td>
                        <td className="py-2 px-3" style={{ color: '#111827' }}>
                          {isBool(item2.raw) ? <BoolBadge val={item2.raw} /> : item2.label === 'Updated At' ? formatDate(item2.display) : item2.display}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ultrasound / Image Section */}
        {imageFields.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Ultrasound Images</h3>
            <div className="flex flex-col gap-4">
              {imageFields.map((field) => (
                <div key={field.key} className="rounded overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="px-3 py-2" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#4b5563' }}>{field.label}</p>
                  </div>
                  <div className="p-3">
                    <img
                      src={field.url}
                      alt={field.label}
                      crossOrigin="anonymous"
                      className="w-full rounded"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
          <p className="text-[10px] text-center mb-1" style={{ color: '#6b7280' }}>
            This document is confidential and contains protected health information.
          </p>
          <p className="text-[10px] text-center" style={{ color: '#9ca3af' }}>
            Generated on {formatDate(document?.date || new Date().toISOString(), 'short')} at{' '}
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).replace(/:/g, '')}
          </p>
        </div>
      </div>
    </>
  );
};

export default DocumentNew;
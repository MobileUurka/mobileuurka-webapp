import React, { useEffect, useState } from "react";
import type { PatientData, TabType } from "../types/patient";
import { userService } from "../services/userServices";

interface OverviewProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Symptom: React.FC<OverviewProps> = ({ patient, setActiveTab }) => {
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchNames = async () => {
      if (patient?.notes) {
        const namesMap: Record<string, string> = {};
        for (const note of patient.notes) {
          if (note.editor && !namesMap[note.editor]) {
            const response = await userService.getUserById(note.editor);
            const user = response?.data?.user;
            namesMap[note.editor] =
              user ? `${user.firstName} ${user.lastName}` : "System";
          }
        }
        setEditorNames(namesMap);
      }
    };
    fetchNames();
  }, [patient?.notes]);

  const getLatest = (data: any[]) =>
    data && data.length > 0 ? data[data.length - 1] : null;

  const latestNote = getLatest(patient?.notes || []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalNotes = patient?.notes?.length ?? 0;

  return (
    <div className="w-[88%] h-[92%] mx-auto flex flex-col">
      {/* Header */}
      <div className="flex my-5 items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Notebook icon */}
          <h3 className="text-sm font-semibold text-gray-700 tracking-wide">
            Notes
          </h3>
        </div>

        {totalNotes > 0 && (
          <span className="text-xs font-medium text-primary bg-white p-3 border-emerald-100 rounded-full px-3 py-2">
            {totalNotes} {totalNotes === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      {/* Body */}
      {latestNote ? (
        <button
          onClick={() => setActiveTab("notes" as TabType)}
          className="flex-1 w-full text-left group rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition-all duration-200 p-3 flex flex-col gap-2 cursor-pointer"
        >
          {/* Title row */}
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-emerald-700 transition-colors capitalize line-clamp-1">
              {latestNote.title}
            </span>
          </div>

          {/* Note body */}
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-4 pl-3.5">
            {latestNote.notes}
          </p>

          {/* Footer */}
          <div className="pl-3.5 flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              {/* Avatar placeholder */}
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-emerald-700">
                  {(editorNames[latestNote.editor] || "S")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[90px]">
                {editorNames[latestNote.editor] || "System"}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {formatDate(latestNote.date)}
            </span>
          </div>
        </button>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
          <svg
            className="w-8 h-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-xs text-gray-400 italic">No notes yet</p>
        </div>
      )}
    </div>
  );
};

export default Symptom;
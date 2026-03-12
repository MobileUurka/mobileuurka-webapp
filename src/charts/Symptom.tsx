import React, { useEffect, useState } from "react";
import type { PatientData, TabType } from '../types/patient';
import { userService } from "../services/userServices";

interface OverviewProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Symptom: React.FC<OverviewProps> = ({ patient, setActiveTab }) => {
  const [editorName, setEditorName] = useState<string>("");

  const getLatest = (data: any[]) => {
    return data && data.length > 0 ? data[data.length - 1] : null;
  };

  const latestNote = getLatest(patient?.notes || []);

  useEffect(() => {
    const fetchEditor = async () => {
      // Check if latestNote exists and has an editor property (assuming it's an ID)
      if (latestNote?.editor) {
        try {
          const response = await userService.getUserById(latestNote.editor);
          // Adjust based on your API response structure (e.g., response.data.name)
          setEditorName(response.data?.name || latestNote.editor);
        } catch (error) {
          console.error("Failed to fetch editor details:", error);
          setEditorName(latestNote.editor); // Fallback to ID on error
        }
      }
    };

    fetchEditor();
  }, [latestNote?.editor]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="w-[88%] h-[92%] mx-auto flex flex-col z-[9999]">
      <div className="w-full h-[45px] my-5 lg:my-[15px] flex items-center">
        <h3 className="text-base font-bold text-gray-800">Notes</h3>
      </div>

      {latestNote ? (
        <div 
          className="w-[90%] mx-auto h-[70%] flex flex-col cursor-pointer group"
          onClick={() => setActiveTab("notes" as TabType)}
        >
          <div className="flex flex-row gap-2.5 items-center text-[0.9em] text-gray-800 capitalize">
            <div className="w-2 aspect-square rounded-full bg-[#008540]"></div>
            <span className="font-semibold group-hover:text-blue-600 transition-colors">
              {latestNote.title}
            </span>
          </div>

          <div className="text-[0.8em] text-gray-600 my-2.5 line-clamp-6 leading-relaxed">
            {latestNote.notes}
          </div>

          <div className="text-[0.8em] text-gray-500 text-left mt-auto">
            {/* Displays the fetched name or the ID as fallback */}
            ~ {editorName || "Loading..."}
          </div>

          <div className="text-[0.8em] text-gray-500 text-right mt-1">
            {formatDate(latestNote.date)}
          </div>
        </div>
      ) : (
        <p className="text-[0.8em] text-center my-[30%] text-gray-500 italic">
          No Note found
        </p>
      )}
    </div>
  );
};

export default Symptom;
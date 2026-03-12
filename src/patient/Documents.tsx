import React, { useEffect, useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { IoDocumentTextOutline, IoWarningOutline } from "react-icons/io5";
import { IoIosWarning, IoMdAdd } from "react-icons/io";
import { FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// Types
import { type PatientData, type TabType } from '../types/patient';

interface DocumentsProps {
  patient: PatientData;
  setActiveTitle: (tab: TabType) => void;
  setDocument: (doc: any) => void;
  document?: any; // The currently selected document object
}

const Documents: React.FC<DocumentsProps> = ({ 
  patient, 
  setActiveTitle, 
  setDocument, 
  document: selectedDoc 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // --- Logic Helpers ---

  function formatDiagnosis(raw: string) {
    if (!raw) return "No diagnosis records";
    const parsePostgresArray = (str: string) => {
      return str
        .replace(/^{|}$/g, "")
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((item) => item.replace(/^"(.*)"$/, "$1").trim());
    };

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
    if (/^no specific conditions detected/i.test(cleaned[0])) return cleaned[0];
    return `Suspected to have ${cleaned.join(" & ")}`;
  }

  const renderResult = (record: any) => {
    if (record.title === "Pregnancy Journey") {
      const risk = record.result?.toLowerCase();
      const label = record.result?.charAt(0).toUpperCase() + record.result?.slice(1).toLowerCase();
      return (
        <div className="flex items-center gap-[5px]">
          <span>{`Risk level is ${label || "Unknown"}`}</span>
        </div>
      );
    }
    if (record.title === "Lab Work") return <span>{formatDiagnosis(record.result)}</span>;
    return <span>{record.result}</span>;
  };

  const generateInfectionMessage = (item: any) => {
    const infectionFields: Record<string, string> = {
      hiv: "HIV", syphilis: "Syphilis", hepB: "Hepatitis B", hepC: "Hepatitis C", rubella: "Rubella",
    };
    let positives = [];
    for (const key in infectionFields) {
      if (item[key] === "Positive") positives.push(infectionFields[key]);
    }
    return positives.length > 0 ? `Positive: ${positives.join(", ")}` : "No positive infections";
  };

  const buildRecord = (array: any[] | undefined, title: string) =>
    array?.map((item) => {
      let result = "";
      if (title === "Lab Work") result = item.diagnosis || "No diagnosis";
      if (title === "Infections") result = generateInfectionMessage(item);
      if (title === "Pregnancy Journey") {
        const relatedExplanations = patient?.explanation?.filter((exp: any) => {
          const expDate = new Date(exp.date).toISOString().split("T")[0];
          const itemDate = new Date(item.date).toISOString().split("T")[0];
          return expDate === itemDate;
        });
        result = relatedExplanations?.length
          ? relatedExplanations.map((exp: any) => exp.risklevel || "No risk level").join(", ")
          : "No explanations";
      }

      return {
        title,
        date_of_visit: item.date || item.timestamp || "N/A",
        editor: item.editor || "System",
        source: item,
        result,
      };
    }) || [];

  const realRecords = [
    ...buildRecord(patient?.triage, "Triage"),
    ...buildRecord(patient?.labwork, "Lab Work"),
    ...buildRecord(patient?.currentPregnancyInfo, "Pregnancy Journey"),
    ...buildRecord(patient?.infections, "Infections"),
  ];

  const filteredRecords = realRecords.filter((record) =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  const handleAddDocument = () => {
    navigate("/Screening", { 
      state: { patientId: patient?.id, returnTo: 'documents', internalTab: 1 } 
    });
  };

  return (
    <div className="w-full">
      {/* Search and Add Bar */}
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
          Add Document
        </button>
      </div>

      {/* Documents Table */}
      <div className="mt-[50px]">
        {/* Table Header */}
        <div className="grid grid-cols-[25%_20%_15%_39%] gap-1 m-2.5 mb-[15px] text-[0.9em] text-[#333]">
          <div className="font-[500] text-black">Name</div>
          <div className="font-[500] text-black">Editor</div>
          <div className="font-[500] text-black">Date</div>
          <div className="font-[500] text-black">Analysis</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {filteredRecords.map((record, index) => (
            <div
              key={index}
              className="grid grid-cols-[25%_20%_15%_39%] gap-1 items-center py-5 px-2.5 text-[0.9em] text-[#333] border-b border-[#dfdede80] cursor-pointer transition-all hover:pl-5"
              onClick={() => {
                setDocument(record);
                setActiveTitle("document" as TabType);
              }}
            >
              <div className="flex flex-row items-center gap-[15px]">
                <div className="w-10 h-10 rounded-full bg-[#ffae1b] flex justify-center items-center text-white text-[1.1em] flex-shrink-0">
                  <IoDocumentTextOutline />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="font-medium text-black truncate">{record.title}</div>
                  <div className="text-[0.8em] text-gray-400">View Details</div>
                </div>
              </div>

              <div className="text-black/70 truncate">{record.editor}</div>
              
              <div className="text-[#333]">{formatDate(record.date_of_visit)}</div>

              <div className="flex items-center text-[#838383] overflow-hidden">
              {(record.result !== "" && record.result !== "No positive infections") && (                  <IoIosWarning
                    className="flex-shrink-0 mr-2.5 p-[2px] rounded-full text-[#FF9500] bg-[#FF950020]"
                    size={20}
                  />
                )}
                <div className="truncate italic">{renderResult(record)}</div>
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="py-20 text-center text-gray-400 italic">
              No matching documents found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;
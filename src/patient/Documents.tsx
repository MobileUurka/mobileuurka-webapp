import React, { useEffect, useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { IoDocumentTextOutline } from "react-icons/io5";
import { IoIosWarning, IoMdAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import DataTable from "../components/DataTable";

// Types
import { type PatientData, type TabType } from '../types/patient';
import { userService } from "../services/userServices";

interface DocumentsProps {
  patient: PatientData;
  setActiveTitle: (tab: TabType) => void;
  setDocument: (doc: any) => void;
  setDocumentTitle: (title: string) => void;
  document?: any; // The currently selected document object
}

const Documents: React.FC<DocumentsProps> = ({
  patient,
  setActiveTitle,
  setDocument,
  setDocumentTitle
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});

  // 2. Fetch names when patient data/notes change
  useEffect(() => {
    const fetchNames = async () => {
      if (patient?.notes) {
        const namesMap: Record<string, string> = {};

        for (const note of patient.notes) {
          if (note.editor && !namesMap[note.editor]) {
            const response = await userService.getUserById(note.editor);
            const user = response?.data?.user;
            namesMap[note.editor] = user ? `${user.firstName} ${user.lastName}` : "System";
          }
        }
        setEditorNames(namesMap);
      }
    };

    fetchNames();
  }, [patient?.notes]);

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
    let negatives = [];

    for (const key in infectionFields) {
      if (item[key] === "Positive") {
        positives.push(infectionFields[key]);
      } else if (item[key] === "Negative") {
        negatives.push(infectionFields[key]);
      }
    }

    if (positives.length > 0) {
      return `Positive: ${positives.join(", ")}${negatives.length > 0 ? ` | Negative: ${negatives.join(", ")}` : ""}`;
    }

    return negatives.length > 0 ? `All Negative: ${negatives.join(", ")}` : "No infection data";
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

  // Define columns for DataTable
  const documentColumns = [
    {
      label: "Name",
      key: "name",
      width: "200px",
      render: (record: any) => (
        <div className="flex flex-row items-center gap-[15px]">
          <div className="w-10 h-10 rounded-full bg-[#ffae1b] flex justify-center items-center text-white text-[1.1em] shrink-0">
            <IoDocumentTextOutline />
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="font-medium text-black truncate">{record.title}</div>
            <div className="text-[0.8em] text-gray-400">View Details</div>
          </div>
        </div>
      )
    },
    {
      label: "Editor",
      key: "editor",
      width: "150px",
      render: (record: any) => (
        <div className="text-black/70 truncate">
          {editorNames[record.editor] || "System"}
        </div>
      )
    },
    {
      label: "Date",
      key: "date",
      width: "150px",
      render: (record: any) => (
        <div className="text-[#333]">{formatDate(record.date_of_visit)}</div>
      )
    },
    {
      label: "Analysis",
      key: "analysis",
      width: "350px",
      render: (record: any) => (
        <div className="flex items-center text-[#838383] overflow-hidden">
          {(record.result !== "" && record.result !== "All Negative" && !record.result.startsWith("All Negative:")) && (
            <IoIosWarning
              className="shrink-0 mr-2.5 p-[2px] rounded-full text-[#FF9500] bg-[#FF950020]"
              size={20}
            />
          )}
          <div className="truncate italic">{renderResult(record)}</div>
        </div>
      )
    }
  ];

  console.log(patient)
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

      {/* Documents Table with Pagination */}
      <DataTable
        columns={documentColumns}
        data={filteredRecords}
        onRowClick={(record) => {
          setDocument(record.source);
          setDocumentTitle(record.title);
          setActiveTitle("document" as TabType);
        }}
        emptyMessage={searchTerm ? `No documents found matching "${searchTerm}"` : "No documents found."}
        initialItemsPerPage={4}
      />
    </div>
  );
};

export default Documents;
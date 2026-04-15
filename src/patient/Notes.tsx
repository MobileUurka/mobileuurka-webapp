import React, { useEffect, useState } from "react";
import { RiSearchLine } from "react-icons/ri";
import { IoDocumentTextOutline } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";

// Types
import { type PatientData, type TabType } from '../types/patient';
import { useNavigate } from "react-router-dom";
import { userService } from "../services/userServices";

interface NotesProps {
  patient: PatientData;
  setActiveTitle: (tab: TabType) => void;
  setNotes: (note: any) => void;
}

const Notes: React.FC<NotesProps> = ({ patient, setActiveTitle, setNotes }) => {
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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleAddNote = () => {
    navigate("/Screening/Notes", {
      state: {
        patientId: patient?.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
      }
    });
  };

  // Safe filtering
  const filteredNotes = (patient?.notes ?? []).filter((note: any) =>
    (note.title || note.content || "").toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="w-full">
      {/* Search and Add Action Bar */}
      <div className="flex flex-row items-center gap-[15px] mb-5">
        <div className="relative w-3/5 h-[50px] rounded-[11px] border border-[#c6c6c68f] bg-transparent flex items-center px-4">
          <RiSearchLine className="text-[#4f453578] text-lg" />
          <input
            type="search"
            placeholder="Search Notes"
            className="w-full h-full border-none outline-none bg-transparent pl-2 text-[15px] placeholder:text-[#4f453578]"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <button
          onClick={handleAddNote}
          className="h-[50px] px-[25px] rounded-[11px] bg-[#008540] text-white flex items-center justify-center gap-2.5 text-[0.9em] cursor-pointer hover:bg-[#007036] transition-all"
        >
          <IoMdAdd className="text-xl" />
          Add Note
        </button>
      </div>

      {/* Notes Table */}
      <div className="mt-[50px]">
        {/* Table Header */}
        <div className="grid grid-cols-[30%_35%_35%] gap-2 m-2.5 mb-[15px] text-[0.9em] text-[#333]">
          <div className="font-[500] text-black">Title</div>
          <div className="font-[500] text-black">Editor</div>
          <div className="font-[500] text-black">Date</div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {filteredNotes.map((note: any, index: number) => (
            <div
              key={note.id || index}
              className="grid grid-cols-[30%_35%_35%] gap-2 items-center py-5 px-2.5 text-[0.9em] text-[#333] border-b border-[#dfdede80] cursor-pointer transition-all hover:pl-5 group"
              onClick={() => {
                setNotes(note);
                setActiveTitle("note" as TabType);
              }}
            >
              {/* Note Icon and Title */}
              <div className="flex flex-row items-center gap-[15px]">
                <div className="w-10 h-10 rounded-full bg-[#ffae1b] flex justify-center items-center text-white text-[1.1em] flex-shrink-0 group-hover:scale-110 transition-transform">
                  <IoDocumentTextOutline />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="font-medium text-black truncate">
                    {note.title || (note.content ? note.content.substring(0, 20) + "..." : "Untitled Note")}
                  </div>
                  <div className="text-[0.8em] text-gray-400">
                    Gestation Week: {note.gestationWeek || "N/A"}
                  </div>
                </div>
              </div>

              {/* Editor Name */}
              <div className="text-black/70 truncate">
                {editorNames[note.editor] || "System"}              </div>

              {/* Date Column */}
              <div className="text-[#333]">
                {formatDate(note.date || note.createdAt)}
              </div>
            </div>
          ))}

          {filteredNotes.length === 0 && (
            <div className="py-20 text-center text-gray-400 italic">
              No clinical notes found for this search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
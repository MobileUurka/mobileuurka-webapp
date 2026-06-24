import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiSearchLine } from "react-icons/ri";
import { IoMdAdd } from "react-icons/io";
import { IoDocumentTextOutline, IoWarningOutline } from "react-icons/io5";

// Types
import { type PatientData, type TabType } from '../types/patient';
import DataTable from "../components/DataTable";

interface MedicationProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Medication: React.FC<MedicationProps> = ({ patient, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const medicationAllergies = (patient.allergies ?? [])
    .filter((item: any) => {
      const type = item.allergyType || item.allergy_type || "";
      return type.toLowerCase() === "medication";
    })
    .map((item: any) => item.allergies)
    .join(", ");

  const handleAddMedication = () => {
    navigate("/Screening/Prescription", {
      state: {
        patientId: patient?.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const filteredMeds = (patient.medications ?? []).filter((med: any) =>
    (med.medicine || med.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const medColumns = [
    {
      label: "Name",
      key: "name",
      width: "220px",
      render: (med: any) => (
        <div className="flex flex-row items-center gap-[15px]">
          <div className="w-10 h-10 rounded-full bg-[#ffae1b] flex justify-center items-center text-white text-[1.1em] flex-shrink-0">
            <IoDocumentTextOutline />
          </div>
          <div className="font-medium text-black truncate">
            {med.medicine || med.name}
          </div>
        </div>
      ),
    },
    {
      label: "Dosage",
      key: "dosage",
      width: "160px",
      render: (med: any) => (
        <div className="text-black/70">{med.dosage || "—"}</div>
      ),
    },
    {
      label: "Duration",
      key: "duration",
      width: "220px",
      render: (med: any) => (
        <div className="text-[#333]">
          {formatDate(med.startDate)} – {formatDate(med.stopDate || med.endDate)}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* Search and Add Bar */}
      <div className="flex flex-row items-center gap-[15px] mb-5">
        <div className="relative w-3/5 h-[50px] rounded-[11px] border border-[#c6c6c68f] bg-transparent flex items-center px-4">
          <RiSearchLine className="text-[#4f453578] text-lg" />
          <input
            type="search"
            placeholder="Search Medicines"
            className="w-full h-full border-none outline-none bg-transparent pl-2 text-[15px] placeholder:text-[#4f453578]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handleAddMedication}
          className="h-[50px] px-[25px] rounded-[11px] bg-[#008540] text-white flex items-center justify-center gap-2.5 text-[0.9em] cursor-pointer hover:bg-[#007036] transition-colors"
        >
          <IoMdAdd className="text-xl" />
          Add <span className="hidden md:flex">Medicine</span>
        </button>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-[74%_26%] gap-4">


        <DataTable
          columns={medColumns}
          data={filteredMeds}
          emptyMessage={
            searchTerm
              ? `No medications found matching "${searchTerm}"`
              : "No active medications prescribed."
          }
          initialItemsPerPage={5}
        />
        {/* Allergy alert — shown above the table when relevant */}
        {medicationAllergies && medicationAllergies.trim() !== "" && (
          <div className="w-full p-5 bg-[#fdf5e6e6] rounded-[10px] flex flex-col gap-3 border border-[#dc9b320d] mb-5">
            <div className="flex flex-col items-start gap-4">
              <div className="w-[46px] h-[46px] rounded-full bg-[#f5b74a1a] flex justify-center items-center text-[#dc9b32] text-[1.4em] flex-shrink-0">
                <IoWarningOutline />
              </div>
              <div className="flex-1">
                <div className="font-[900] text-[0.9em] text-black mb-1">Medication Alert</div>
                <p className="text-[#22110a] text-[0.8em] leading-normal m-0">
                  The patient has a known adverse reaction to{" "}
                  <span className="font-bold underline">{medicationAllergies}</span>.
                  Please review the allergy history and consider alternative medications.
                </p>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="mt-[15px] w-[150px] h-[45px] bg-[#2f1104] text-white rounded-md flex justify-center items-center text-[0.8em] cursor-pointer hover:bg-black transition-all"
                >
                  View Allergies
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Medication;

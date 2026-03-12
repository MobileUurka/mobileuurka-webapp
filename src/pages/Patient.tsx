import React, { useEffect, useState, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { IoFlagSharp } from "react-icons/io5";
import { FaRegCopy } from "react-icons/fa";
import { TiTick } from "react-icons/ti";
import { LuBell } from "react-icons/lu";
import { Tooltip } from "react-tooltip";

// Assets & Styles
import "../Patient.css";
import profilePic from "/images/Default.png"; // Ensure this path is correct

// Services
import { patientService } from '../services/patientServices';
import { authService } from '../services/authServices';

// Components
import Chat from "../components/Chat";
import Overview from "../patient/Overview";
import Profile from "../patient/Profile";
import Medication from "../patient/Medication";
import Documents from "../patient/Documents";
import Notes from "../patient/Notes";
import Document from "../patient/Document";
import Note from "../patient/Note";
import Notepad from "../components/Notepad";

// Types
import type { PatientData, TabType } from "../types/patient";

const Patient: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // State
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [chatActive, setChatActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Selection states for drill-down views
  const [selectedDocument, setSelectedDocument] = useState<any>([]);
  const [selectedNote, setSelectedNote] = useState<string>("");

  useEffect(() => {
    const user = authService.getUser();
    setCurrentUser(user);

    if (id) {
      fetchPatientData(id);
    }
  }, [id]);

  const fetchPatientData = async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientService.getPatientCompleteProfile(patientId);
      if (response.success) {
        setPatient(response.data);
      } else {
        setError("Patient profile not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---
  const calculateAge = (dob?: string): string | number => {
    if (!dob) return "N/A";
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr || dateStr === "-" || dateStr === "Invalid Date") return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  const handleCopyId = async (): Promise<void> => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // --- Section Rendering Helper (Sidebar) ---
  const renderSidebarSection = (
    title: string,
    items: { label: string | React.ReactNode; value: string | number | undefined; color?: string }[],
    bgClass: string = "bg-[#F6F6F6]/80"
  ) => (
    <section className="mb-4">
      <div className="font-sm mb-2">{title}</div>
      <div className={`${bgClass} py-1 rounded-[15px] flex flex-col border border-transparent`}>
        {items.map((item, index) => (
          <div className="w-[90%] mx-auto flex justify-between py-2.5 border-b border-gray-200/50 last:border-0" key={index}>
            <div className="text-[#09090980] text-[13px] flex items-center">{item.label}</div>
            <div className={`font-medium text-xs capitalize text-right ${item.color || "text-black/80"}`}>
              {item.value || "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  // --- Memoized Data Mapping ---
  const patientDetailsData = useMemo(() => {
    if (!patient) return [];
    const history = patient.patientHistory?.[0] || {};
    const lastVisit = patient.visits?.[patient.visits.length - 1] || {};

    return [
      { label: "Age", value: calculateAge(patient.dob) },
      { label: "Gravida + Parity", value: `${history.gravida || 0}+${history.parity || 0}` },
      {
        label: (
          <div className="flex items-center gap-2">
            Blood Type
            {patient.rh === "-" && (
              <IoFlagSharp
                data-tooltip-id="patient-tooltip"
                data-tooltip-content="Anti-D Due (28-30 weeks)"
                className="text-red-600"
              />
            )}
          </div>
        ),
        value: `${patient.bloodgroup || ''}${patient.rh || ''}`
      },
      { label: "Last Visit", value: formatDate(lastVisit.date) },
      { label: "EDD", value: formatDate(history.estimatedDueDate) },
    ];
  }, [patient]);

  const allergiesData = useMemo(() => {
    const defaults = [
      { label: "Medication", value: "None" },
      { label: "Food", value: "None" },
      { label: "Environment", value: "No reaction" },
    ];

    const currentAllergies = patient?.allergies ?? [];

    if (currentAllergies.length === 0) {
      return defaults.map(d => ({ ...d, color: "text-gray-400" }));
    }

    return defaults.map(def => {
      const found = currentAllergies.find((a: any) => {
        // Capitalize the first letter for comparison
        const type = a.allergyType || "";
        const capitalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        return capitalized === def.label;
      });

      const val = found ? found.allergies : def.value;
      const isNegative = val === "None" || val === "No reaction";

      return {
        label: def.label,
        value: val,
        color: isNegative ? "text-black/80" : "text-black/80"
      };
    });
  }, [patient]);

  const lifestyleData = useMemo(() => {
    const latest = patient?.patientLifestyle?.[patient.patientLifestyle.length - 1];
    return [
      { label: "Alcohol", value: latest?.alcoholConsumption || "None" },
      { label: "Smoking", value: latest?.smoking || "None" },
      {
        label: (
          <div className="flex items-center gap-2">
            Diet
            {latest?.diet === "Vegan" && (
              <IoFlagSharp
                data-tooltip-id="patient-tooltip"
                data-tooltip-content="Patient is vegan — consider testing for Vitamin B12"
                className="text-blue-500"
              />
            )}
          </div>
        ),
        value: latest?.diet || "Not specified"
      },
    ];
  }, [patient]);

  if (loading) return <div className="patient-page"><div className="loading text-center p-10">Loading Patient Data...</div></div>;
  if (error || !patient) return <div className="patient-page"><div className="error text-red-500 text-center p-10">{error || "Patient not found"}</div></div>;

  return (
    <div className="w-full">
      <div className={`w-full h-[90vh] grid grid-cols-[25%_75%] transition-all duration-300 ease-in-out relative ${chatActive ? '-translate-x-[28%] grid-cols-[25%_75%_28%]' : ''}`}>

        {/* Left Sidebar */}
        <div className="w-full pr-6 border-r border-[#09090917] h-screen relative overflow-hidden">
          <div className="w-full mx-auto flex flex-col pb-5 h-[calc(100%-40px)] overflow-y-auto scrollbar-none">

            {/* Profile Pic Section */}
            <div className="w-full h-[100px] flex items-center">
              <div className="w-full mx-auto h-[100px] flex items-center">
                <div className="w-[50px] aspect-square rounded-full bg-white mr-[2px] flex justify-center items-center overflow-hidden border border-gray-100 shadow-sm">
                  <img src={profilePic} alt="patient" className="w-full h-full object-cover" />
                </div>

                <div className="w-[calc(100%-70px)] flex justify-between items-center">
                  <div className="ml-[15px] flex flex-col gap-[3px] text-[0.9em] text-[#333]">
                    <div className="text-black/80 font-bold">{patient?.name}</div>
                    <div className="text-[0.8em] text-[#09090980] flex items-center gap-2">
                      ID: {id?.toString().slice(0, 8)}...
                      <span onClick={handleCopyId} className="cursor-pointer hover:text-gray-900" style={{ color: copied ? "#4CAF50" : "#666" }}>
                        {copied ? <TiTick size={16} /> : <FaRegCopy size={14} />}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rendered Sidebar Sections */}
            {renderSidebarSection("Patient Details", patientDetailsData)}
            {renderSidebarSection("Allergies", allergiesData)}
            {renderSidebarSection("Lifestyle", lifestyleData)}

            <Tooltip id="patient-tooltip" style={{ fontSize: ".8em", zIndex: 9999, borderRadius: '8px' }} />
          </div>
        </div>

        {/* Right Content */}
        <div className="ml-5 detail flex flex-col w-full h-screen overflow-hidden">
          <div className="flex flex-col h-full">

            {/* Tab Navigation */}
            <div className="w-[96.5%] flex flex-row items-center justify-between mx-auto">
              <ul className="my-10 list-none flex flex-row gap-[25px] text-[#4f4535d9] cursor-pointer">
                {(["overview", "profile", "medication", "documents", "notes"] as const).map((tab) => (
                  <li
                    key={tab}
                    className={`relative pb-[5px] transition-all duration-300 text-sm ${activeTab === tab ? "font-semibold text-black/80 border-b border-black" : "hover:text-black/80"}`}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === "documents") setSelectedDocument([]);
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </li>
                ))}
              </ul>

              {/* AI Buttons */}
              <div className="flex flex-row items-center gap-[10px]">
                <div className="w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] flex justify-center items-center cursor-pointer relative">
                  <LuBell size={20} className="text-gray-600" />
                 
                </div>
                <div className="w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] flex justify-center items-center cursor-pointer" onClick={() => setChatActive((prev) => !prev)}>
                  <img src="/images/logo.png" alt="AI Chat" className="w-1/2" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="w-[96.5%] mx-auto mt-[-5px] flex-1 overflow-y-auto h-[calc(90vh-120px)] scrollbar-hide">
              {activeTab === "overview" && <Overview patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "profile" && <Profile patient={patient} />}
              {activeTab === "medication" && <Medication patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "documents" && <Documents patient={patient} setActiveTitle={setActiveTab} setDocument={setSelectedDocument} />}
              {activeTab === "notes" && <Notes patient={patient} setActiveTitle={setActiveTab} setNotes={setSelectedNote} />}
              {activeTab === "document" && <Document document={selectedDocument} />}
              {activeTab === "note" && <Note note={selectedNote} user={currentUser} />}
              {activeTab === "notepad" && <Notepad patient={patient} user={currentUser} />}
            </div>
          </div>
        </div>

        {chatActive && (
          <div className="w-full mx-auto h-screen ml-4 ">
            <Chat patient={patient} user={currentUser} />
          </div>
        )}

      </div>
    </div>
  );
};

export default Patient;
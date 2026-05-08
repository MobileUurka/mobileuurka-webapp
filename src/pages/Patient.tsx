import React, { useEffect, useState, useMemo } from "react";
import { useParams } from 'react-router-dom';
import { IoFlagSharp } from "react-icons/io5";
// import { FaRegCopy } from "react-icons/fa";
// import { TiTick } from "react-icons/ti";
import { LuBell } from "react-icons/lu";
import { FiChevronDown, FiMenu, FiX, FiRefreshCw } from "react-icons/fi";
import { Tooltip } from "react-tooltip";

// Assets & Styles
import "../Patient.css";
import profilePic from "/images/Default.png"; // Ensure this path is correct

// Services
import { authService } from '../services/authServices';
import { userService } from '../services/userServices';
import { api } from '../services/apiClient';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatientProfile, invalidateProfile } from '../store/patientProfileSlice';
import { useFeedbackContext } from '../contexts/FeedbackContext';

// Components
import Chat from "../components/Chat";
import Overview from "../patient/Overview";
import Profile from "../patient/Profile";
import Medication from "../patient/Medication";
import Documents from "../patient/Documents";
import Notes from "../patient/Notes";
import Note from "../patient/Note";
import Notepad from "../components/Notepad";
import LoadingSpinner from "../components/LoadingSpinner";

// Types
import type { TabType } from "../types/patient";
import SymptomReportNew from "../patient/SymptomReportNew";
import DocumentNew from "../patient/DocumentNew";

const Patient: React.FC = () => {
  const { id } = useParams<{ id: string }>();


  // --- Store ---
  const dispatch = useAppDispatch();
  const patient = useAppSelector(s => id ? s.patientProfile.profiles[id] ?? null : null);
  const status = useAppSelector(s => id ? s.patientProfile.statusById[id] ?? 'idle' : 'idle');
  const error = useAppSelector(s => id ? s.patientProfile.errorById[id] ?? null : null);

  // Feedback context — tag the widget with this patient's info
  const { setPatientContext, clearPatientContext } = useFeedbackContext();

  // Only show full-page loading when there's no cached data at all
  // When re-fetching after a socket invalidation, keep showing stale data silently
  const isFirstLoad = (status === 'idle' || status === 'loading') && !patient;
  const loading = isFirstLoad;

  // State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [chatActive, setChatActive] = useState<boolean>(false);
  // const [copied, setCopied] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [tabDropdownOpen, setTabDropdownOpen] = useState<boolean>(false);
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});

  // Symptom report history — fetched once when the patient loads
  const [symptomHistory, setSymptomHistory] = useState<any[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (tabDropdownOpen && !target.closest('.tab-dropdown')) {
        setTabDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tabDropdownOpen]);

  // Selection states for drill-down views
  const [selectedDocument, setSelectedDocument] = useState<any>([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>("");
  const [selectedNote, setSelectedNote] = useState<any>(null);

  useEffect(() => {
    const user = authService.getUser();
    setCurrentUser(user);
  }, []);

  // Keep the feedback widget aware of which patient we're viewing
  useEffect(() => {
    if (patient?.name && id) {
      setPatientContext(id, patient.name);
    }
    return () => clearPatientContext();
  }, [patient?.name, id]);

  // Resolve all editor UUIDs upfront when patient data loads
  useEffect(() => {
    if (!patient) return;

    const fetchEditorNames = async () => {
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const toResolve = new Set<string>();

      // Collect all editor UUIDs from all document types
      const sources = [
        ...(patient?.notes ?? []),
        ...(patient?.triage ?? []),
        ...(patient?.labwork ?? []),
        ...(patient?.currentPregnancyInfo ?? []),
        ...(patient?.infections ?? []),
      ];

      for (const item of sources) {
        if (item?.editor && uuidLike.test(item.editor)) {
          toResolve.add(item.editor);
        }
      }

      if (toResolve.size === 0) return;

      const namesMap: Record<string, string> = {};
      for (const uid of toResolve) {
        try {
          const response = await userService.getUserById(uid);
          const user = response?.data?.user;
          if (user) namesMap[uid] = `${user.firstName} ${user.lastName}`;
        } catch {
          // leave unresolved — will fall back to "System"
        }
      }
      setEditorNames(namesMap);
    };

    fetchEditorNames();
  }, [patient]);

  // Fires on mount (status starts as 'idle') and again when a socket record event
  // calls invalidateProfile(id) — re-fetches silently in the background.
  useEffect(() => {
    if (id && status === 'idle') {
      console.log(`🗂️ [Patient.tsx] status=idle, dispatching fetchPatientProfile(${id})`);
      dispatch(fetchPatientProfile(id));
    }
  }, [id, status, dispatch]);

  // Fetch symptom report history for the timeline and diff view
  useEffect(() => {
    if (!id || !patient) return;
    api.get(`/patients/${id}/symptom-history?limit=50`)
      .then((data: any) => {
        if (data?.success && Array.isArray(data.data?.history)) {
          setSymptomHistory(data.data.history);
        }
      })
      .catch(err => console.warn('[Patient.tsx] symptom-history fetch failed:', err));
  }, [id, patient?.id]);

  // Escalation handler — sends a CRITICAL alert notification to the org
  const handleEscalate = async (message: string): Promise<void> => {
    if (!id) return;
    await api.post(`/patients/${id}/escalate`, { message });
  };

  const handleRefresh = () => {
    if (!id) return;
    console.log(`🔄 [Patient.tsx] manual refresh for: ${id}`);
    // Delete lastFetched so the thunk bypasses the stale check, then fetch
    dispatch(invalidateProfile(id));
    // status → idle triggers the useEffect which dispatches fetchPatientProfile
    // No need to dispatch it here too
  };

  // const handleHospitalAssignmentUpdate = (hospitalName: string) => {
  //   if (patient) {
  //     setPatient({
  //       ...patient,
  //       hospital: hospitalName
  //     });
  //   }
  // };

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

  // const handleCopyId = async (): Promise<void> => {
  //   if (!id) return;
  //   try {
  //     await navigator.clipboard.writeText(id);
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 2000);
  //   } catch (err) {
  //     console.error("Copy failed", err);
  //   }
  // };

  // --- Section Rendering Helper (Sidebar) ---
  const renderSidebarSection = (
    title: string,
    items: { label: string | React.ReactNode; value: string | number | undefined; color?: string }[],
    bgClass: string = "bg-[#F6F6F6]/80"
  ) => (
    <section className="mb-4">
      <div className="font-sm mb-2">
        <span>{title}</span>
      </div>
      <div className={`${bgClass} py-1 rounded-[15px] flex flex-col border border-transparent`}>
        {items.map((item, index) => (
          <div className="w-[90%] mx-auto flex justify-between py-2.5 border-b border-gray-200/50 last:border-0" key={index}>
            <div className="text-[#09090980] text-[13px] flex items-center">{item.label}</div>
            <div className={`font-medium text-xs capitalize text-right ${item.color || "text-black/80"}`}>{item.value}
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

  if (loading) return <div className="patient-page"><div className="loading"><LoadingSpinner message="Loading patient data..." size="lg" /></div></div>;
  if (error || !patient) return <div className="patient-page"><div className="error text-red-500 text-center p-10">{error || "Patient not found"}</div></div>;

  return (
    loading ? (
      <LoadingSpinner message="Loading patient data..." size="lg" fullPage />
    ) : 
    error || !patient ? (
      <div className="p-10 text-center">
        <div className="text-red-500 mb-4">Error: {error || "Patient not found"}</div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-[#008540] text-white rounded-md hover:bg-[#006633]"
        >
          Go Back
        </button>
      </div>
    ) : (
    <div className="w-full">
      <div className={`w-full h-[90vh] transition-[translate] duration-300 ease-in-out relative$ ${chatActive ? `lg:grid lg:grid-cols-[25%_75%_28%] flex flex-col lg:-translate-x-[28%] ` : 'lg:grid lg:grid-cols-[25%_75%] flex flex-col'
        }`}>

        {/* Mobile Header */}
        <div className="lg:hidden w-full bg-white border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex justify-center items-center overflow-hidden border border-gray-100 shadow-sm">
              <img src={profilePic} alt="patient" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-black/80">{patient?.name}</div>
              {/* <div className="text-sm text-gray-500 flex items-center gap-2">
                ID: {id?.toString().slice(0, 8)}...
                <span onClick={handleCopyId} className="cursor-pointer hover:text-gray-900" style={{ color: copied ? "#4CAF50" : "#666" }}>
                  {copied ? <TiTick size={16} /> : <FaRegCopy size={14} />}
                </span>
              </div> */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <button
              onClick={handleRefresh}
              title="Refresh patient data"
              className={`p-2 rounded-lg bg-[#f1ede97a] hover:bg-[#f1ede9] transition-colors ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={status === 'loading'}
            >
              <FiRefreshCw size={18} className={`text-gray-600 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 rounded-lg bg-[#f1ede97a] hover:bg-[#f1ede9] transition-colors">
              <LuBell size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Full Screen Below Header */}
        {sidebarOpen && (
          <div className="lg:hidden absolute top-[80px] left-0 right-0 bottom-0 bg-white z-40 overflow-y-auto">
            <div className="p-4">
              {renderSidebarSection("Patient Details", patientDetailsData, "bg-[#F6F6F6]/80")}
              {renderSidebarSection("Allergies", allergiesData, "bg-[#F6F6F6]/80")}
              {renderSidebarSection("Lifestyle", lifestyleData, "bg-[#F6F6F6]/80")}
            </div>
          </div>
        )}

        {/* Desktop Left Sidebar */}
        <div className="hidden lg:block w-full pr-6 border-r border-[#09090917] h-screen relative overflow-hidden">
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
                    {/* <div className="text-[0.8em] text-[#09090980] flex items-center gap-2">
                      ID: {id?.toString().slice(0, 8)}...
                      <span onClick={handleCopyId} className="cursor-pointer hover:text-gray-900" style={{ color: copied ? "#4CAF50" : "#666" }}>
                        {copied ? <TiTick size={16} /> : <FaRegCopy size={14} />}
                      </span>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>

            {/* Rendered Sidebar Sections */}
            {renderSidebarSection("Patient Details", patientDetailsData, "bg-[#F6F6F6]/80")}
            {renderSidebarSection("Allergies", allergiesData, "bg-[#F6F6F6]/80")}
            {renderSidebarSection("Lifestyle", lifestyleData, "bg-[#F6F6F6]/80")}

            <Tooltip id="patient-tooltip" style={{ fontSize: ".8em", zIndex: 9999, borderRadius: '8px' }} />
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 mt-2 lg:mt-0 lg:ml-5 detail flex flex-col w-full h-full overflow-hidden">
          <div className="flex flex-col h-full">

            {/* Tab Navigation */}
            <div className="w-full lg:w-[96.5%] flex flex-col lg:flex-row items-start lg:items-center justify-between mx-auto px-4 lg:px-0">
              {/* Mobile Tab Dropdown */}
              <div className="lg:hidden w-full mb-4 flex flex-row items-center gap-2">
                <div className="relative w-full tab-dropdown">
                  <button
                    onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-[#008540] flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className="capitalize">{activeTab}</span>
                    <FiChevronDown className={`transition-transform duration-200 ${tabDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {tabDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 overflow-hidden">
                      {(["overview", "profile", "medication", "documents", "notes"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setActiveTab(tab);
                            setTabDropdownOpen(false);
                            if (tab === "documents") {
                              setSelectedDocument([]);
                              setSelectedDocumentTitle("");
                            }
                          }}                          className={`w-full p-3 text-left text-sm hover:bg-gray-50 transition-colors capitalize ${activeTab === tab ? 'bg-[#008540]/10 text-[#008540] font-medium' : 'text-gray-700'
                            }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setChatActive(!chatActive)}
                  className="p-3 rounded-lg bg-[#f1ede97a] hover:bg-[#f1ede9] transition-colors"
                >
                  <img src="/images/logo.png" alt="AI Chat" className="w-5 h-5" />
                </button>
              </div>

              {/* Desktop Tab Navigation */}
              <ul className="hidden lg:flex my-10 list-none flex-row gap-[25px] text-[#4f4535d9] cursor-pointer">
                {(["overview", "profile", "medication", "documents", "notes"] as const).map((tab) => (
                  <li
                    key={tab}
                    className={`relative pb-[5px] transition-all duration-300 text-sm ${activeTab === tab ? "font-semibold text-black/80 border-b border-black" : "hover:text-black/80"}`}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === "documents") {
                        setSelectedDocument([]);
                        setSelectedDocumentTitle("");
                      }
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </li>
                ))}
              </ul>

              {/* Desktop AI Buttons */}
              <div className="hidden lg:flex flex-row items-center gap-[10px]">
                <button
                  onClick={handleRefresh}
                  title="Refresh patient data"
                  className={`w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] hover:bg-[#f1ede9] flex justify-center items-center cursor-pointer transition-colors ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={status === 'loading'}
                >
                  <FiRefreshCw size={18} className={`text-gray-600 ${status === 'loading' ? 'animate-spin' : ''}`} />
                </button>
                {/* <div className="w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] flex justify-center items-center cursor-pointer relative">
                  <LuBell size={20} className="text-gray-600" />
                </div> */}
                <div className="w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] flex justify-center items-center cursor-pointer" onClick={() => setChatActive((prev) => !prev)}>
                  <img src="/images/logo.png" alt="AI Chat" className="w-1/2" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="w-full lg:w-[96.5%] mx-auto lg:mt-[-5px] flex-1 overflow-y-auto px-4 lg:px-0 pb-4 lg:pb-0 lg:h-[calc(90vh-120px)] scrollbar-hide">
              {activeTab === "overview" && <Overview patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "profile" && <Profile patient={patient} />}
              {activeTab === "medication" && <Medication patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "documents" && <Documents patient={patient} setActiveTitle={setActiveTab} setDocument={setSelectedDocument} setDocumentTitle={setSelectedDocumentTitle} editorNames={editorNames} />}
              {activeTab === "notes" && <Notes patient={patient} setActiveTitle={setActiveTab} setNotes={setSelectedNote} />}
              {activeTab === "document" && (
                <DocumentNew
                  document={selectedDocument}
                  title={selectedDocumentTitle}
                  patient={patient}
                  onBack={() => setActiveTab("documents")}
                  editorNames={editorNames}
                />
              )}
              {activeTab === "symptomReport" && (
                <SymptomReportNew
                  report={selectedDocument}
                  patient={patient}
                  onBack={() => setActiveTab("documents")}
                  reportHistory={symptomHistory}
                  onEscalate={handleEscalate}
                />
              )}
              {activeTab === "note" && <Note note={selectedNote} user={currentUser} onBack={() => setActiveTab("notes")} />}
              {activeTab === "notepad" && <Notepad patient={patient} user={currentUser} />}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {chatActive && (
          <div className={`${!isMobile
            ? 'w-full mx-auto h-screen ml-4'
            : 'fixed inset-0 bg-white z-50 flex flex-col'
            }`}>
            {/* Mobile Chat Header */}
            {isMobile && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">AI Assistant</h3>
                <button
                  onClick={() => setChatActive(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX size={20} />
                </button>
              </div>
            )}
            <Chat patient={patient} user={currentUser} />
          </div>
        )}


      </div>
    </div>)
  );
};

export default Patient;
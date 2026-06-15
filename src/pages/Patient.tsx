import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { IoFlagSharp } from "react-icons/io5";
import { FiChevronDown, FiMenu, FiX, FiRefreshCw, FiEdit2 } from "react-icons/fi";
import { Tooltip } from "react-tooltip";

// Assets & Styles
import "../Patient.css";
import profilePic from "/images/Default.png";

// Services
import { userService } from '../services/userServices';
import { api } from '../services/apiClient';
import { patientService } from '../services/patientServices';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatientProfile, invalidateProfile } from '../store/patientProfileSlice';
import { useFeedbackContext } from '../contexts/FeedbackContext';
import { useAuth } from '../contexts/AuthContext';

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
  const navigate = useNavigate();

  // --- Store ---
  const dispatch = useAppDispatch();
  const patient = useAppSelector(s => id ? s.patientProfile.profiles[id] ?? null : null);
  const status = useAppSelector(s => id ? s.patientProfile.statusById[id] ?? 'idle' : 'idle');
  const error = useAppSelector(s => id ? s.patientProfile.errorById[id] ?? null : null);

  const { setPatientContext, clearPatientContext } = useFeedbackContext();

  const isFirstLoad = (status === 'idle' || status === 'loading') && !patient;
  const loading = isFirstLoad;

  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [chatActive, setChatActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});
  const [symptomHistory, setSymptomHistory] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState("");
  const [selectedNote, setSelectedNote] = useState<any>(null);

  // Discharge modal
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeReason, setDischargeReason] = useState('');
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [discharging, setDischarging] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tabDropdownOpen && !(e.target as Element).closest('.tab-dropdown')) {
        setTabDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tabDropdownOpen]);

  useEffect(() => {
    if (patient?.name && id) setPatientContext(id, patient.name);
    return () => clearPatientContext();
  }, [patient?.name, id]);

  useEffect(() => {
    if (!patient) return;
    const fetchEditorNames = async () => {
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const toResolve = new Set<string>();
      const sources = [
        ...(patient?.notes ?? []),
        ...(patient?.triage ?? []),
        ...(patient?.labwork ?? []),
        ...(patient?.currentPregnancyInfo ?? []),
        ...(patient?.infections ?? []),
      ];
      const namesMap: Record<string, string> = {};
      for (const item of sources) {
        if (item?.editor && (item as { editorName?: string }).editorName) {
          namesMap[item.editor] = (item as { editorName: string }).editorName;
        } else if (item?.editor && uuidLike.test(item.editor)) {
          toResolve.add(item.editor);
        }
      }
      for (const uid of toResolve) {
        try {
          const response = await userService.getUserById(uid);
          const user = response?.data?.user;
          if (user) {
            namesMap[uid] = user.displayLabel
              ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
              ?? 'Former user';
          }
        } catch { /* leave unresolved */ }
      }
      if (Object.keys(namesMap).length > 0) setEditorNames(namesMap);
    };
    fetchEditorNames();
  }, [patient]);

  useEffect(() => {
    if (id && status === 'idle') dispatch(fetchPatientProfile(id));
  }, [id, status, dispatch]);

  useEffect(() => {
    if (!id || !patient) return;
    api.get(`/patients/${id}/symptom-history?limit=50`)
      .then((data: any) => {
        if (data?.success && Array.isArray(data.data?.history)) setSymptomHistory(data.data.history);
      })
      .catch(err => console.warn('[Patient.tsx] symptom-history fetch failed:', err));
  }, [id, patient?.id]);

  // --- Handlers ---
  const handleEscalate = async (message: string) => {
    if (!id) return;
    await api.post(`/patients/${id}/escalate`, { message });
  };

  const handleRefresh = () => {
    if (!id) return;
    dispatch(invalidateProfile(id));
  };

  const handleDischarge = async () => {
    if (!id || !dischargeReason.trim()) return;
    setDischarging(true);
    try {
      const res: any = await patientService.dischargePatient(id, {
        reason: dischargeReason.trim(),
        notes: dischargeNotes.trim() || undefined,
      });
      if (res?.success) {
        setShowDischargeModal(false);
        setDischargeReason('');
        setDischargeNotes('');
        dispatch(invalidateProfile(id));
      } else {
        alert('Discharge failed: ' + (res?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Discharge failed: ' + (err?.message || 'Network error'));
    } finally {
      setDischarging(false);
    }
  };

  const handleReactivate = async () => {
    if (!id) return;
    if (!confirm('Reactivate this patient? They will reappear in the active patients list.')) return;
    try {
      const res: any = await patientService.reactivatePatient(id);
      if (res?.success) dispatch(invalidateProfile(id));
      else alert('Reactivation failed: ' + (res?.message || 'Unknown error'));
    } catch (err: any) {
      alert('Reactivation failed: ' + (err?.message || 'Network error'));
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
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderSidebarSection = (
    title: string,
    items: { label: string | React.ReactNode; value: string | number | undefined; color?: string }[],
    bgClass = "bg-[#F6F6F6]/80"
  ) => (
    <section className="mb-4">
      <div className="font-sm mb-2"><span>{title}</span></div>
      <div className={`${bgClass} py-1 rounded-[15px] flex flex-col border border-transparent`}>
        {items.map((item, index) => (
          <div className="w-[90%] mx-auto flex justify-between py-2.5 border-b border-gray-200/50 last:border-0" key={index}>
            <div className="text-[#09090980] text-[13px] flex items-center">{item.label}</div>
            <div className={`font-medium text-xs capitalize text-right ${item.color || "text-black/80"}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );

  // --- Memoized Data ---
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
              <IoFlagSharp data-tooltip-id="patient-tooltip" data-tooltip-content="Anti-D Due (28-30 weeks)" className="text-red-600" />
            )}
          </div>
        ),
        value: `${patient.bloodgroup || ''}${patient.rh !== 'Unknown' ? patient.rh : ''}`
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
    if (currentAllergies.length === 0) return defaults.map(d => ({ ...d, color: "text-gray-400" }));
    return defaults.map(def => {
      const found = currentAllergies.find((a: any) => {
        const type = a.allergyType || "";
        return (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()) === def.label;
      });
      const val = found ? found.allergies : def.value;
      return { label: def.label, value: val, color: "text-black/80" };
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
              <IoFlagSharp data-tooltip-id="patient-tooltip" data-tooltip-content="Patient is vegan — consider testing for Vitamin B12" className="text-blue-500" />
            )}
          </div>
        ),
        value: latest?.diet || "Not specified"
      },
    ];
  }, [patient]);

  const InfectionsData = useMemo(() => {
    const latest = patient?.infections?.[patient.infections?.length - 1];
    return [
      { label: "HIV", value: latest?.hiv || "Unknown" },
      { label: "Syphilis", value: latest?.syphilis || "Unknown" },
      { label: "Hepatitis B", value: latest?.hepB || "Unknown" },
      { label: "Hepatitis C", value: latest?.hepC || "Unknown" },
      { label: "Rubella", value: latest?.rubella || "Unknown" },
    ];
  }, [patient]);

  // --- Early returns ---
  if (loading) return <LoadingSpinner message="Loading patient data..." size="lg" fullPage />;
  if (error || !patient) return (
    <div className="p-10 text-center">
      <div className="text-red-500 mb-4">Error: {error || "Patient not found"}</div>
      <button onClick={() => window.history.back()} className="px-4 py-2 bg-[#008540] text-white rounded-md hover:bg-[#006633]">
        Go Back
      </button>
    </div>
  );

  // --- Render ---
  return (
    <div className="w-full">
      {/* ── Main layout grid ─────────────────────────────────────────── */}
      <div className={`w-full h-[90vh] transition-[translate] duration-300 ease-in-out relative ${
        chatActive
          ? 'lg:grid lg:grid-cols-[25%_75%_28%] flex flex-col lg:-translate-x-[28%]'
          : 'lg:grid lg:grid-cols-[25%_75%] flex flex-col'
      }`}>

        {/* ── Mobile Header ───────────────────────────────────────────── */}
        <div className="lg:hidden w-full bg-white border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex justify-center items-center overflow-hidden border border-gray-100 shadow-sm">
              <img src={profilePic} alt="patient" className="w-full h-full object-cover" />
            </div>
            <div className="font-bold text-black/80">{patient?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg bg-[#f1ede97a] hover:bg-[#f1ede9] transition-colors ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={status === 'loading'}
            >
              <FiRefreshCw size={18} className={`text-gray-600 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile Sidebar overlay ──────────────────────────────────── */}
        {sidebarOpen && (
          <div className="lg:hidden absolute top-[80px] left-0 right-0 bottom-0 bg-white z-40 overflow-y-auto">
            <div className="flex">
              <button onClick={() => setSidebarOpen(false)} className="ml-auto mt-2 mr-5 p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4">
              {renderSidebarSection("Patient Details", patientDetailsData)}
              {renderSidebarSection("Allergies", allergiesData)}
              {renderSidebarSection("Lifestyle", lifestyleData)}
              {renderSidebarSection("Infections", InfectionsData)}
            </div>
          </div>
        )}

        {/* ── Desktop Left Sidebar ────────────────────────────────────── */}
        <div className="hidden lg:block w-full pr-6 border-r border-[#09090917] h-screen relative overflow-hidden">
          <div className="w-full mx-auto flex flex-col pb-5 h-[calc(100%-40px)] overflow-y-auto scrollbar-none">

            {/* Profile pic */}
            <div className="w-full h-[100px] flex items-center py-8">
              <div className="w-[50px] aspect-square rounded-full bg-white mr-[2px] flex justify-center items-center overflow-hidden border border-gray-100 shadow-sm">
                <img src={profilePic} alt="patient" className="w-full h-full object-cover" />
              </div>
              <div className="ml-[15px] flex flex-col gap-[3px]">
                <div className="text-black/80 font-bold text-[0.9em]">{patient?.name}</div>
                {patient?.isActive === false && (
                  <span className="text-xs text-amber-600 font-medium">Discharged</span>
                )}
              </div>
            </div>

            {renderSidebarSection("Patient Details", patientDetailsData)}
            {renderSidebarSection("Allergies", allergiesData)}
            {renderSidebarSection("Lifestyle", lifestyleData)}
            {renderSidebarSection("Infections", InfectionsData)}

            <Tooltip id="patient-tooltip" style={{ fontSize: ".8em", zIndex: 9999, borderRadius: '8px' }} />
          </div>
        </div>

        {/* ── Right Content area ──────────────────────────────────────── */}
        <div className="flex-1 mt-2 lg:mt-0 lg:ml-5 detail flex flex-col w-full h-full overflow-hidden">
          <div className="flex flex-col h-full">

            {/* Discharged banner
            {patient?.isActive === false && (
              <div className="w-full lg:w-[96.5%] mx-auto mb-3 px-4 lg:px-0">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">Patient Discharged</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <span className="font-medium">Reason:</span> {patient.dischargeReason || '—'}
                      {patient.dischargeDate && (
                        <span className="ml-3 text-amber-600">
                          {new Date(patient.dischargeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                    {patient.dischargeNotes && (
                      <p className="text-xs text-amber-600 mt-0.5">{patient.dischargeNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            )} */}

            {/* Tab Navigation */}
            <div className="w-full lg:w-[96.5%] flex flex-col lg:flex-row items-start lg:items-center justify-between mx-auto px-4 lg:px-0">

              {/* Mobile: dropdown */}
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
                            if (tab === "documents") { setSelectedDocument([]); setSelectedDocumentTitle(""); }
                          }}
                          className={`w-full p-3 text-left text-sm hover:bg-gray-50 capitalize ${activeTab === tab ? 'bg-[#008540]/10 text-[#008540] font-medium' : 'text-gray-700'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setChatActive(!chatActive)} className="p-3 rounded-lg bg-[#f1ede97a] hover:bg-[#f1ede9] transition-colors">
                  <img src="/images/logo.png" alt="AI Chat" className="w-5 h-5" />
                </button>
              </div>

              {/* Desktop: tab list */}
              <ul className="hidden lg:flex my-10 list-none flex-row gap-[25px] text-[#4f4535d9] cursor-pointer">
                {(["overview", "profile", "medication", "documents", "notes"] as const).map((tab) => (
                  <li
                    key={tab}
                    className={`relative pb-[5px] transition-all duration-300 text-sm ${activeTab === tab ? "font-semibold text-black/80 border-b border-black" : "hover:text-black/80"}`}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === "documents") { setSelectedDocument([]); setSelectedDocumentTitle(""); }
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </li>
                ))}
              </ul>

              {/* Desktop: action buttons */}
              <div className="hidden lg:flex flex-row items-center gap-[10px]">
                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  title="Refresh"
                  disabled={status === 'loading'}
                  className={`w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] hover:bg-[#f1ede9] flex justify-center items-center cursor-pointer transition-colors ${status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiRefreshCw size={18} className={`text-gray-600 ${status === 'loading' ? 'animate-spin' : ''}`} />
                </button>

                {/* Edit Records */}
                <button
                  onClick={() => navigate('/Screening/EditRecord', { state: { patientId: id, patientName: patient?.name } })}
                  title="Edit patient records"
                  className="px-3 h-[50px] rounded-[4px] bg-[#f1ede97a] hover:bg-[#f1ede9] text-gray-600 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <FiEdit2 size={14} />
                  Edit
                </button>

                {/* Discharge / Reactivate */}
                {patient?.isActive !== false ? (
                  <button
                    onClick={() => setShowDischargeModal(true)}
                    title="Discharge patient"
                    className="px-3 h-[50px] rounded-[4px] bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    Discharge
                  </button>
                ) : (
                  <button
                    onClick={handleReactivate}
                    title="Reactivate patient"
                    className="px-3 h-[50px] rounded-[4px] bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1.5 transition-colors border border-green-200"
                  >
                    Reactivate
                  </button>
                )}

                {/* AI Chat */}
                <div
                  className="w-[50px] aspect-square rounded-[4px] bg-[#f1ede97a] flex justify-center items-center cursor-pointer"
                  onClick={() => setChatActive(prev => !prev)}
                >
                  <img src="/images/logo.png" alt="AI Chat" className="w-1/2" />
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="w-full lg:w-[96.5%] mx-auto lg:mt-[-5px] flex-1 overflow-y-auto px-4 lg:px-0 pb-4 lg:pb-0 lg:h-[calc(90vh-120px)] scrollbar-hide">
              {activeTab === "overview" && <Overview patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "profile" && <Profile patient={patient} />}
              {activeTab === "medication" && <Medication patient={patient} setActiveTab={setActiveTab} />}
              {activeTab === "documents" && (
                <Documents
                  patient={patient}
                  setActiveTitle={setActiveTab}
                  setDocument={setSelectedDocument}
                  setDocumentTitle={setSelectedDocumentTitle}
                  editorNames={editorNames}
                />
              )}
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
              {activeTab === "note" && <Note note={selectedNote} user={currentUser ?? { id: '' }} onBack={() => setActiveTab("notes")} />}
              {activeTab === "notepad" && <Notepad patient={patient} user={currentUser ?? { id: '' }} />}
            </div>
          </div>
        </div>

        {/* ── Chat Panel ──────────────────────────────────────────────── */}
        {chatActive && (
          <div className={`${!isMobile ? 'w-full mx-auto h-screen ml-4' : 'fixed inset-0 bg-white z-50 flex flex-col'}`}>
            {isMobile && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">AI Assistant</h3>
                <button onClick={() => setChatActive(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <FiX size={20} />
                </button>
              </div>
            )}
            <Chat patient={patient} user={currentUser ?? { id: '' }} />
          </div>
        )}

      </div>

      {/* ── Discharge Modal ─────────────────────────────────────────── */}
      {showDischargeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800">Discharge Patient</h3>
              <button
                onClick={() => { setShowDischargeModal(false); setDischargeReason(''); setDischargeNotes(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FiX size={18} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Discharging <span className="font-medium text-gray-700">{patient?.name}</span> moves them to the archived list.
              Their records are preserved and you can reactivate them at any time.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={dischargeReason}
                onChange={e => setDischargeReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#008540]"
              >
                <option value="">Select a reason…</option>
                <option value="Gave birth / Delivered">Gave Birth / Delivered</option>
                <option value="Transferred to another facility">Transferred to Another Facility</option>
                <option value="Lost to follow-up">Lost to Follow-Up</option>
                <option value="Patient request">Patient Request</option>
                <option value="Completed care">Completed Care</option>
                <option value="Deceased">Deceased</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={dischargeNotes}
                onChange={e => setDischargeNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context…"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#008540] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDischargeModal(false); setDischargeReason(''); setDischargeNotes(''); }}
                disabled={discharging}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDischarge}
                disabled={!dischargeReason || discharging}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {discharging ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                    Discharging…
                  </>
                ) : 'Confirm Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patient;

import React from "react";
import { type PatientData } from "../types/patient";
import { formatGravidaParityDisplay, readParityFromRecord } from "../utils/gravidaParity";

interface ProfileProps {
  patient: PatientData;
}

const Profile: React.FC<ProfileProps> = ({ patient }) => {
  // --- Helper Functions ---
  const getAge = (dobString: string | undefined): string => {
    if (!dobString) return "-";
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return `${age} Years`;
  };

  const getLatestEntry = (entries: any[] | undefined) => {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries[entries.length - 1];
  };

  const latestHistory = getLatestEntry(patient?.patientHistory);
  // --- Sub-component for Sections ---
  const renderSection = (title: string, items: { label: string; value: string | number | boolean | null | undefined }[]) => (
    <section className="mb-8 ">
      <div className="font-sm mb-2">{title}</div>
      <div className="bg-[#F6F6F6] rounded-xl border border-gray-100 overflow-hidden p-2">
        {items.map((item, index) => (
          <div 
            className={`flex justify-between items-center p-3 text-sm ${
              index !== items.length - 1 ? "border-b border-gray-100" : ""
            }`} 
            key={index}
          >
            <div className="text-gray-500 font-medium">{item.label}</div>
            <div className="capitalize text-gray-800 font-medium text-right text-xs max-w-[60%]">
              {item.value?.toString() || "-"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  // --- Data Mapping ---
  const personalDetails = [
    { label: "Full Name", value: patient?.name },
    { label: "Date of Birth", value: patient?.dob },
    { label: "Age", value: patient?.age ? `${patient.age} years` : getAge(patient?.dob) },
    { label: "Race", value: patient?.race === "Other" ? patient?.raceOther : patient?.race },
    { label: "Blood Type", value: `${patient?.bloodgroup || ""} ${patient?.rh != "Unknown" ? patient.rh : "" }`.trim() },
    { label: "Hospital", value: patient?.hospital },
  ];

  const parityParts = readParityFromRecord(latestHistory ?? {});

  const obstetricHistoryDetails = [
    {
      label: "Gravida / Parity",
      value: latestHistory?.gravida != null
        ? formatGravidaParityDisplay(latestHistory.gravida, parityParts.viable, parityParts.loss)
        : null,
    },
    { label: "C-Section", value: latestHistory?.csection },
    { label: "Postpartum Hemorrhage (PPH)", value: latestHistory?.pph },
    { label: "Infertility", value: latestHistory?.infertility },
    { label: "IVF", value: latestHistory?.ivf },
    { label: "Miscarriage", value: latestHistory?.miscarriage },
    { label: "Stillbirth", value: latestHistory?.stillbirth },
    { label: "History of Eclampsia", value: latestHistory?.eclampsiaHistory },
    { label: "History of GDM", value: latestHistory?.gestationalDiabetesHistory },
  ];

  const familyHistoryDetails = [
    { label: "Preeclampsia", value: latestHistory?.famHistoryPreeclampsia },
    { label: "Cardiac Disease", value: latestHistory?.famHistoryCardiacDisease },
    { label: "Gestational Hypertension", value: latestHistory?.famHistoryGestationalHypertension },
    { label: "Sickle Cell", value: latestHistory?.famSickleCell },
    { label: "Partner's Age", value: latestHistory?.maleAge },
  ];



  const medicalHistoryDetails = [
    { label: "Autoimmune Disorders", value: latestHistory?.autoimmune },
    { label: "Chronic Hypertension", value: latestHistory?.chronicHypertension },
    { label: "Diabetes Mellitus", value: latestHistory?.diabetesMelitus },
    { label: "Kidney Disorders", value: latestHistory?.kidney },
    { label: "PCOS", value: latestHistory?.pcos },
  ];

  const contactDetails = [
    { label: "Phone Number", value: patient?.phone },
    { label: "Email", value: patient?.email },
    { label: "Address", value: patient?.address },
    { label: "Insurance", value: patient?.insurance },
    { label: "Occupation", value: patient?.occupation },
  ];

  return (
    <div className="w-full h-full bg-white overflow-y-auto scrollbar-hide">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left Column */}
        <div className="space-y-2">
          {renderSection("Obstetric History", obstetricHistoryDetails)}
          {renderSection("Family History", familyHistoryDetails)}
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          {renderSection("Patient Details", personalDetails)}
          {renderSection("Contact Details", contactDetails)}
          {renderSection("Medical History", medicalHistoryDetails)}
          {renderSection("Health Summary", [
            { label: "Address", value: patient?.address },
            { label: "Date Registered", value: patient?.createdAt ? new Date(patient.createdAt).toLocaleDateString() : "-" }
          ])}
        </div>

      </div>
    </div>
  );
};

export default Profile;
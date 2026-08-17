export interface PatientData {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    dob: string;
    bloodgroup: string;
    rh: string;
    phone: string;
    email: string;
    address: string;
    occupation: string;
    hospital: string;
    isActive: boolean;
    // Nested Arrays from your new API
    visits?: any[];
    triage?: any[];
    labwork?: any[];
    patientHistory?: any[];
    patientLifestyle?: any[];
    allergies?: any[];
    medications?: any[];
    symptomReasoningReport?: any[];
    riskAssessment?: any[];
    explanation?: any[];
    notes?: any[];
    [key: string]: any; // Fallback for other fields
  }

  export type TabType = "overview" | "profile" | "medication" | "documents" | "notes" | "document" | "note" | "notepad" | "symptomReport" | "audit";
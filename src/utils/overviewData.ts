import type { PatientData } from '../types/patient';

const TRIAGE_VITAL_KEYS = ['systolic', 'diastolic', 'temperature', 'bmi', 'heartRate', 'weight', 'respiratoryRate', 'oxygenSaturation'];

const LAB_MONITORED_KEYS = [
  'haemoglobin',
  'platelets',
  'creatinine',
  'bun',
  'ast',
  'alt',
  'tsh',
  'glutamyl',
  'wbc',
];

const FETAL_KEYS = ['fhr', 'femurHeight', 'headCircumference'];

export function hasWeightData(triage?: any[] | null): boolean {
  if (!Array.isArray(triage) || triage.length === 0) return false;
  return triage.some((entry) => entry.weight != null && entry.weight !== '' && !Number.isNaN(Number(entry.weight)));
}

export function hasTriageVitals(triage?: any[] | null): boolean {
  if (!Array.isArray(triage) || triage.length === 0) return false;
  return triage.some((entry) =>
    TRIAGE_VITAL_KEYS.some((key) => entry[key] != null && entry[key] !== '' && !Number.isNaN(Number(entry[key])))
  );
}

export function hasLabData(patient?: PatientData | null): boolean {
  const labwork = patient?.labwork;
  if (!Array.isArray(labwork) || labwork.length === 0) return false;
  return labwork.some((entry) =>
    LAB_MONITORED_KEYS.some((key) => entry[key] != null && entry[key] !== '' && !Number.isNaN(Number(entry[key])))
  );
}

export function hasFetalData(fetalInfo?: any[] | null): boolean {
  if (!Array.isArray(fetalInfo) || fetalInfo.length === 0) return false;
  return fetalInfo.some((entry) =>
    FETAL_KEYS.some((key) => entry[key] != null && entry[key] !== '' && !Number.isNaN(Number(entry[key])))
  );
}

export function hasRiskAssessmentData(patient?: { explanation?: any[] } | null): boolean {
  const explanations = patient?.explanation;
  if (!Array.isArray(explanations) || explanations.length === 0) return false;
  return explanations.some((entry) => {
    const hasScores = [entry.cp, entry.ms, entry.oh, entry.rf].some(
      (v) => v != null && Number(v) > 0
    );
    const hasFeatures = typeof entry.features === 'string' && entry.features.trim().length > 0;
    return hasScores || hasFeatures;
  });
}

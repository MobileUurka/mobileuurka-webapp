import { patientService } from '../services/patientServices';

/** Maps screening tab IDs to their record table and gestation field name(s). */
export const SCREENING_GESTATION_CONFIG: Record<
  string,
  { table: string; gestationFields: string[]; label: string }
> = {
  Visits: { table: 'visits', gestationFields: ['gestationWeek'], label: 'visit' },
  Triage: { table: 'triage', gestationFields: ['gestationWeek'], label: 'triage' },
  Journey: { table: 'currentPregnancyInfo', gestationFields: ['gestationweek', 'gestationWeek'], label: 'pregnancy info' },
  Lab: { table: 'labwork', gestationFields: ['gestationweek', 'gestationWeek'], label: 'lab work' },
  Fetal: { table: 'fetalInfo', gestationFields: ['gestationWeek'], label: 'fetal info' },
  Ultrasound: { table: 'ultrasounds', gestationFields: ['gestationWeek'], label: 'ultrasound' },
  Prescription: { table: 'medications', gestationFields: ['gestationWeek'], label: 'prescription' },
  Notes: { table: 'notes', gestationFields: ['gestationWeek'], label: 'note' },
};

export type GestationSource = 'screening' | 'visit';

export type ResolvedGestation = {
  date: string;
  gestationWeek: number;
  source: GestationSource;
  sourceLabel: string;
  visitNumber?: number;
};

export const calculateGestationWeek = (referenceDate: string, referenceGestationWeek: number): number => {
  if (!referenceDate || referenceGestationWeek == null || referenceGestationWeek <= 0) return 0;

  try {
    const refDate = new Date(referenceDate);
    const today = new Date();
    const daysDifference = Math.floor((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDifference = Math.floor(daysDifference / 7);
    return Math.max(0, referenceGestationWeek + weeksDifference);
  } catch (error) {
    console.error('Error calculating gestation week:', error);
    return 0;
  }
};

const readGestationFromRecord = (
  record: Record<string, unknown>,
  gestationFields: string[]
): number | null => {
  for (const field of gestationFields) {
    const value = record[field];
    if (value != null && value !== '') {
      const n = Number(value);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
};

export const fetchGestationFromScreeningForm = async (
  patientId: string,
  tabId: string
): Promise<ResolvedGestation | null> => {
  const config = SCREENING_GESTATION_CONFIG[tabId];
  if (!config) return null;

  try {
    const response = await patientService.getRecords(config.table, {
      patientId,
      limit: 1,
      orderBy: 'date',
      order: 'desc',
    });
    const record = response.data?.records?.[0];
    if (!record?.date) return null;

    const gestationWeek = readGestationFromRecord(record, config.gestationFields);
    if (gestationWeek == null) return null;

    return {
      date: record.date,
      gestationWeek,
      source: 'screening',
      sourceLabel: config.label,
      visitNumber: record.visitNumber != null ? Number(record.visitNumber) : undefined,
    };
  } catch (error) {
    console.error(`Error fetching gestation from ${tabId}:`, error);
    return null;
  }
};

export const fetchGestationFromVisits = async (patientId: string): Promise<ResolvedGestation | null> => {
  try {
    const response = await patientService.getRecords('visits', {
      patientId,
      limit: 1,
      orderBy: 'date',
      order: 'desc',
    });
    const lastVisit = response.data?.records?.[0];
    if (!lastVisit?.date || lastVisit.gestationWeek == null || lastVisit.gestationWeek === '') {
      return null;
    }

    const gestationWeek = Number(lastVisit.gestationWeek);
    if (isNaN(gestationWeek) || gestationWeek <= 0) return null;

    return {
      date: lastVisit.date,
      gestationWeek,
      source: 'visit',
      sourceLabel: 'visit',
      visitNumber: lastVisit.visitNumber != null ? Number(lastVisit.visitNumber) : undefined,
    };
  } catch (error) {
    console.error('Error fetching gestation from visits:', error);
    return null;
  }
};

/** Prefer the current screening form's last record; fall back to the last visit. */
export const resolveGestationForPatient = async (
  patientId: string,
  tabId?: string
): Promise<ResolvedGestation | null> => {
  if (tabId) {
    const fromScreening = await fetchGestationFromScreeningForm(patientId, tabId);
    if (fromScreening) return fromScreening;
  }
  return fetchGestationFromVisits(patientId);
};

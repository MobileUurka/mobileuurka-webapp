// Blood sugar units for the lab form.
//
// The backend's gestational-diabetes rules compare fasting, 1-hour, 2-hour and random
// blood sugar with mmol/L thresholds, so the API must always receive mmol/L. Labs report
// in either mmol/L or mg/dL, so the person entering results states the unit and the form
// converts before sending. HbA1c (%) and every other lab field are not touched.

export const GLUCOSE_UNIT_FIELD = 'glucoseUnit';
export const GLUCOSE_FIELDS = ['fbs', 'fbs1', 'fbs2', 'randombloodsugar'] as const;

export type GlucoseUnit = 'mmol/L' | 'mg/dL';
export const GLUCOSE_UNITS: GlucoseUnit[] = ['mmol/L', 'mg/dL'];

const STORAGE_KEY = 'glucoseUnit';

// D-glucose molar mass 180.16 g/mol (PubChem CID 5793). mg/dL to mmol/L:
// mg/dL x 10 dL/L / 180.16 mg/mmol, i.e. divide by 18.016.
const GLUCOSE_MOLAR_MASS_MG_PER_MMOL = 180.16;

export function mgdlToMmol(mgdl: number): number {
  return (mgdl * 10) / GLUCOSE_MOLAR_MASS_MG_PER_MMOL;
}

function isGlucoseUnit(value: unknown): value is GlucoseUnit {
  return value === 'mmol/L' || value === 'mg/dL';
}

/** The unit chosen last time on this device, or '' so the first entry must choose. */
export function loadGlucoseUnit(): GlucoseUnit | '' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isGlucoseUnit(stored) ? stored : '';
  } catch {
    return '';
  }
}

export function saveGlucoseUnit(unit: string): void {
  try {
    if (isGlucoseUnit(unit)) localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // Storage unavailable (private mode): the choice simply is not remembered.
  }
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function hasGlucoseValue(data: Record<string, unknown>): boolean {
  return GLUCOSE_FIELDS.some(name => hasValue(data[name]));
}

/**
 * Returns a copy with the four glucose fields in mmol/L. Values entered in mg/dL are
 * divided by 18.016 and left unrounded, because rounding can move a reading across a
 * diagnostic threshold. mmol/L values pass through unchanged.
 */
export function glucoseToMmol<T extends Record<string, unknown>>(data: T): T {
  if (data[GLUCOSE_UNIT_FIELD] !== 'mg/dL') return data;
  const converted: Record<string, unknown> = { ...data };
  for (const name of GLUCOSE_FIELDS) {
    const raw = converted[name];
    if (!hasValue(raw)) continue;
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) converted[name] = mgdlToMmol(numeric);
  }
  return converted as T;
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { patientService } from '../services/patientServices';
import { SCREENING_FORMS, EDIT_RECORD_TYPES } from '../constants/screeningForms';
import PatientSelector from '../components/PatientSelector';
import ScreeningForm from '../components/ScreeningForm';
import { formatParityNotation, readParityFromRecord, toParityStorage } from '../utils/gravidaParity';
import { buildDietFoodGroups, flattenDietFoodGroups, stripDietFoodGroupFields } from '../utils/lifestyleDiet';

// Small inline spinner (matches the one in ScreeningForm)
const MiniSpinner = () => (
  <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecordOption {
  id: string;
  label: string;
  raw: Record<string, any>;
}

// ── Helper: format a date string for display ──────────────────────────────────
const fmt = (d?: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

// ── Helper: flatten intake (patients table) data into form-compatible shape ───
const flattenIntake = (raw: Record<string, any>): Record<string, any> => ({
  ...raw,
  firstName: raw.firstName ?? raw.name?.split(' ')[0] ?? '',
  lastName: raw.lastName ?? raw.name?.split?.(' ').slice(1).join(' ') ?? '',
  emergencyContactName: raw.emergencyContact?.name ?? '',
  emergencyContactPhone: raw.emergencyContact?.phone ?? '',
  emergencyContactRelationship: raw.emergencyContact?.relationship ?? '',
});

// ── Helper: flatten history data ──────────────────────────────────────────────
const flattenHistory = (raw: Record<string, any>): Record<string, any> => {
  const { viable, loss } = readParityFromRecord(raw);
  const partnerHadPreviousPartner =
    raw.malePreeclampsiaPrevHistory === 'yes' || raw.malePreeclampsiaPrevHistory === 'unknown'
      ? 'yes'
      : 'no';

  return {
    ...raw,
    gravida: raw.gravida ?? '',
    parityNotation: formatParityNotation(viable, loss),
    partnerHadPreviousPartner,
  };
};

const flattenLifestyle = (raw: Record<string, any>): Record<string, any> => ({
  ...raw,
  ...flattenDietFoodGroups(raw),
});

// ── Map tableName → flatten fn ────────────────────────────────────────────────
const FLATTEN: Record<string, (r: Record<string, any>) => Record<string, any>> = {
  patients: flattenIntake,
  patientHistory: flattenHistory,
  patientLifestyle: flattenLifestyle,
};

// ── Build a display label for a record row ────────────────────────────────────
const buildRecordLabel = (raw: Record<string, any>, tableName: string): string => {
  if (tableName === 'patients') return raw.name ?? raw.id;
  const date = raw.date ?? raw.createdAt;
  const parts: string[] = [];
  if (date) parts.push(fmt(date));
  if (raw.visitNumber != null) parts.push(`Visit #${raw.visitNumber}`);
  if (raw.gestationWeek != null || raw.gestationweek != null)
    parts.push(`GW ${raw.gestationWeek ?? raw.gestationweek}`);
  if (raw.allergyType) parts.push(raw.allergyType);
  if (raw.medicine) parts.push(raw.medicine);
  return parts.length > 0 ? parts.join(' · ') : raw.id ?? '(record)';
};

// ─────────────────────────────────────────────────────────────────────────────
const EditRecord = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Step 1: select patient — pre-filled if navigated from Patient page
  const [patientId, setPatientId] = useState(() => (location.state as any)?.patientId ?? '');
  const [patientName, setPatientName] = useState(() => (location.state as any)?.patientName ?? '');

  // Step 2: select record type
  const [recordTypeIndex, setRecordTypeIndex] = useState<number | ''>('');

  // Step 3: select specific record
  const [recordOptions, setRecordOptions] = useState<RecordOption[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');

  // Step 4: edit form
  const [prefillData, setPrefillData] = useState<Record<string, any> | null>(null);

  // ── Step 2 → fetch record list whenever patient + type changes ──────────────
  useEffect(() => {
    if (!patientId || recordTypeIndex === '') {
      setRecordOptions([]);
      setSelectedRecordId('');
      setPrefillData(null);
      return;
    }

    const type = EDIT_RECORD_TYPES[recordTypeIndex as number];
    setLoadingRecords(true);
    setSelectedRecordId('');
    setPrefillData(null);

    const load = async () => {
      try {
        if (type.tableName === 'patients') {
          // Intake record is the patient itself
          const res: any = await patientService.getPatient(patientId);
          const patient = res?.data?.patient ?? res?.data ?? null;
          if (patient) {
            setRecordOptions([{
              id: patientId,
              label: patient.name ?? patientId,
              raw: patient,
            }]);
          } else {
            setRecordOptions([]);
          }
        } else {
          const res: any = await patientService.getRecords(type.tableName, {
            patientId,
            limit: 50,
            orderBy: 'date',
            order: 'desc',
          });
          const rows: any[] = res?.data?.records ?? [];
          setRecordOptions(rows.map(r => ({
            id: r.id,
            label: buildRecordLabel(r, type.tableName),
            raw: r,
          })));
        }
      } catch (e) {
        console.error('EditRecord: failed to load records', e);
        setRecordOptions([]);
      } finally {
        setLoadingRecords(false);
      }
    };

    load();
  }, [patientId, recordTypeIndex]);

  // ── Step 3 → pre-fill form when a specific record is selected ───────────────
  useEffect(() => {
    if (!selectedRecordId || recordTypeIndex === '') {
      setPrefillData(null);
      return;
    }
    const option = recordOptions.find(r => r.id === selectedRecordId);
    if (!option) return;

    const type = EDIT_RECORD_TYPES[recordTypeIndex as number];
    const flattenFn = FLATTEN[type.tableName] ?? ((r: any) => r);
    setPrefillData({
      ...flattenFn(option.raw),
      patientId,
      patientName,
    });
  }, [selectedRecordId, recordOptions, recordTypeIndex, patientId, patientName]);

  // ── Submit handler ───────────────────────────────────────────────────────────
  const handleSubmit = async (data: Record<string, any>) => {
    if (recordTypeIndex === '') return;
    const type = EDIT_RECORD_TYPES[recordTypeIndex as number];

    try {
      if (type.tableName === 'patients') {
        // Patient intake → PUT /patients/:id
        const payload: Record<string, any> = {
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          address: data.address,
          email: data.email,
          phone: data.phone,
          nationalId: data.nationalId,
          emergencyContact: {
            name: data.emergencyContactName,
            phone: data.emergencyContactPhone,
            relationship: data.emergencyContactRelationship,
          },
          insurance: data.insurance === 'Other' ? (data.insurance_other || 'Other') : (data.insurance || ''),
          occupation: data.occupation,
          bloodgroup: data.bloodgroup,
          rh: data.rh,
          race: data.race,
          hospital: data.hospital,
        };
        const res: any = await patientService.updatePatient(patientId, payload);
        if (res?.success) {
          alert('Patient intake updated successfully!');
          navigate('/Screening');
        } else {
          alert('Update failed: ' + (res?.message || 'Unknown error'));
        }
      } else {
        // Dynamic table record → PUT /patients/data/:tableName/:recordId
        // For patientHistory, map gravida + parity notation to storage fields
        const payload = { ...data };
        if (type.tableName === 'patientHistory') {
          if (payload.gravida != null) {
            payload.gravida = Number(payload.gravida) || 0;
          }
          if (typeof payload.parityNotation === 'string') {
            Object.assign(payload, toParityStorage(payload.parityNotation));
            delete payload.parityNotation;
          }
          payload.maleAge = payload.maleAge != null && payload.maleAge !== '' ? Number(payload.maleAge) : 0;
          payload.malePreeclampsiaPrevHistory = payload.malePreeclampsiaPrevHistory || 'no';
        }
        if (type.tableName === 'patientLifestyle') {
          if (payload.mealsPerDay != null && payload.mealsPerDay !== '') {
            payload.mealsPerDay = Number(payload.mealsPerDay);
          }
          payload.dietFoodGroups = buildDietFoodGroups(payload);
          stripDietFoodGroupFields(payload);
        }
        // Strip frontend-only meta fields
        delete payload.patientName;
        delete payload.patientId; // controller gets patientId from the existing record

        const res: any = await patientService.updateRecord(type.tableName, selectedRecordId, payload);
        if (res?.success) {
          alert(`${type.label} record updated successfully!`);
          navigate('/Screening');
        } else {
          alert('Update failed: ' + (res?.message || 'Unknown error'));
        }
      }
    } catch (err: any) {
      console.error('EditRecord submit error:', err);
      alert('Update failed: ' + (err?.message || 'Network error'));
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────
  const selectedType = recordTypeIndex !== '' ? EDIT_RECORD_TYPES[recordTypeIndex as number] : null;
  const formDef = selectedType ? SCREENING_FORMS[selectedType.formKey] : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-2">
      <div className="mb-8 space-y-6">

        {/* ── Step 1: Patient ── */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Patient <span className="text-red-500">*</span>
          </p>
          <PatientSelector
            value={patientId}
            onChange={(id, name) => {
              setPatientId(id);
              setPatientName(name);
              setRecordTypeIndex('');
              setSelectedRecordId('');
              setPrefillData(null);
            }}
            placeholder="Select patient"
            required
          />
        </div>

        {/* ── Step 2: Record type ── */}
        {patientId && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Record Type <span className="text-red-500">*</span>
            </p>
            <div className="relative w-full">
              <select
                value={recordTypeIndex}
                onChange={e => {
                  setRecordTypeIndex(e.target.value === '' ? '' : Number(e.target.value));
                  setSelectedRecordId('');
                  setPrefillData(null);
                }}
                className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#008540]"
              >
                <option value="">Select record type…</option>
                {EDIT_RECORD_TYPES.map((t, i) => (
                  <option key={t.tableName} value={i}>{t.label}</option>
                ))}
              </select>
              <MdOutlineKeyboardArrowDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={20}
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Select specific record ── */}
        {patientId && recordTypeIndex !== '' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Select Record <span className="text-red-500">*</span>
            </p>

            {loadingRecords ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <MiniSpinner />
                Loading records…
              </div>
            ) : recordOptions.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">
                No {selectedType?.label.toLowerCase()} records found for this patient.
              </p>
            ) : (
              <div className="relative w-full">
                <select
                  value={selectedRecordId}
                  onChange={e => setSelectedRecordId(e.target.value)}
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#008540]"
                >
                  <option value="">Select a record to edit…</option>
                  {recordOptions.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <MdOutlineKeyboardArrowDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={20}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 4: Editing form ── */}
      {prefillData && formDef && (
        <div className="border-t border-gray-100 pt-8">
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Editing — {selectedType?.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Record ID: {selectedRecordId}
            </p>
          </div>

          <ScreeningForm
            title={formDef.title}
            fields={formDef.fields}
            onSubmit={handleSubmit}
            initialData={prefillData}
            isLastStep={true}
          />
        </div>
      )}
    </div>
  );
};

export default EditRecord;

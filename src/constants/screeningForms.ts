interface ChipOption {
  field: string;
  label: string;
  countField?: string;
  countLabel?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'chip-group';
  required?: boolean;
  options?: string[];
  chips?: ChipOption[];
  placeholder?: string;
  readonly?: boolean;

  // NEW
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  max?: string | number;
  min?: string | number;

  dependsOn?: {
    field: string;
    value: any | any[];
  };
}

export const SCREENING_FORMS: Record<string, { title: string; fields: FormField[] }> = {
  Intake: {
    title: "Patient Intake",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      {
        name: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: 'e.g 0712345678',
        minLength: 10,
        maxLength: 10,
        pattern: /^0\d{9}$/,
        patternMessage: 'Phone number must be exactly 10 digits and start with 0'
      },
      {
        name: 'nationalId', label: 'National ID', type: 'text', required: false, minLength: 8,
        maxLength: 8, patternMessage: 'National ID must be exactly 8 digits'

      },
      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'address', label: 'Address', type: 'text' },
      {
        name: 'insurance',
        label: 'Insurance Provider',
        type: 'select',
        options: [
          'APA Insurance',
          'Britam',
          'CIC Insurance',
          'Jubilee Insurance',
          'Old Mutual',
          'GA Insurance',
          'Madison Insurance',
          'Heritage Insurance',
          'Kenya Orient Insurance',
          'Directline Assurance',
          'Occidental Insurance',
          'AAR Insurance',
          'Sanlam',
          'Liberty Life',
          'ICEA LION',
          'None',
          'Other'
        ]
      },
      {
        name: 'insurance_other',
        label: 'Specify Insurance Provider',
        type: 'text',
        placeholder: 'Enter insurance provider name',
        dependsOn: { field: 'insurance', value: 'Other' }
      },
      { name: 'occupation', label: 'Occupation', type: 'text' },

      // Emergency Contact (nested JSON flattened)
      { name: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text' },
      {
        name: 'emergencyContactPhone',
        label: 'Emergency Contact Phone',
        type: 'text',
        placeholder: 'e.g 0712345678',
        minLength: 10,
        maxLength: 10,
        pattern: /^0\d{9}$/,
        patternMessage: 'Phone number must be exactly 10 digits and start with 0'
      },
      { name: 'emergencyContactRelationship', label: 'Relationship with Emergency contact', type: 'text' },


      { name: 'bloodgroup', label: 'Blood Group', type: 'select', required: true, options: ['A', 'B', 'AB', 'O', 'Unknown'] },
      { name: 'rh', label: 'RH Factor', type: 'select', required: true, options: ['+', '-', 'Unknown'] },

      {
        name: 'race', label: 'Race / Ethnicity', type: 'select', options: [
          'Black / African',
          'Asian',
          'White / Caucasian',
          'Mixed / Multiracial',
          'Middle Eastern',
          'Indigenous / Native',
          'Prefer not to say'
        ]
      },
      { name: 'hospital', label: 'Hospital', type: 'select', required: true, options: [] } // Will be populated dynamically
    ]
  },

  Visits: {
    title: "Patient Visit Information",
    fields: [
      { name: 'editor', label: 'Doctor/Editor', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'visitNumber', label: 'Visit Number', type: 'number', required: true },
      {
        name: 'visitReason',
        label: 'Visit Reason',
        type: 'select',
        required: true,
        options: [
          'Routine ANC Visit',
          'First ANC Booking',
          'Ultrasound Check',
          'Bleeding / Complication',
          'Fetal Wellbeing',
          'Postnatal Visit',
          // 'Other'
        ]
      },
      // {
      //   name: 'visitReason2',
      //   label: 'Other Visit Reason',
      //   type: 'text',
      //   required: true,
      //   dependsOn: { field: 'visitReason', value: 'Other' }

      // },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
      { name: 'date', label: 'Visit Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'visitExplanation', label: 'Visit Explanation', type: 'textarea', required: true, placeholder: 'Detailed explanation of visit' },
      { name: 'nextVisit', label: 'Next Visit Date', type: 'date' }
    ]
  },

  Allergy: {
    title: "Allergy Information",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'allergyType', label: 'Allergy Type', type: 'select', required: true, options: ['medication', 'food', 'environmental', 'other'] },
      { name: 'allergies', label: 'Allergies', type: 'text', required: true, placeholder: 'List allergies' },
      { name: 'date', label: 'Date Recorded', type: 'date', required: true, max: new Date().toISOString().split('T')[0] }
    ]
  },

  Triage: {
    title: "Triage Assessment",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Assessment Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
      { name: 'height', label: 'Height (cm)', type: 'number', required: true },
      { name: 'weight', label: 'Weight (kg)', type: 'number', required: true },
      { name: 'bmi', label: 'BMI (Auto-calculated)', type: 'number', required: true, readonly: true },
      { name: 'heartRate', label: 'Heart Rate (bpm)', type: 'number', required: true },
      { name: 'systolic', label: 'Systolic BP', type: 'number', required: true },
      { name: 'diastolic', label: 'Diastolic BP', type: 'number', required: true },
      { name: 'map', label: 'MAP (Auto-calculated)', type: 'number', required: true, readonly: true },
      { name: 'temperature', label: 'Temperature (°C)', type: 'number', required: true }
    ]
  },

  History: {
    title: "Patient Medical History",
    fields: [
      // ── Admin / meta ────────────────────────────────────────────────────────
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date Recorded', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gravidaParity', label: 'Gravida + Parity', type: 'text', required: true, placeholder: 'e.g. 2+1', pattern: /^\d+\+\d+$/, patternMessage: 'Format must be Gravida+Parity (e.g. 2+1)' },
      { name: 'interval', label: 'Pregnancy Interval (months)', type: 'number' },
      { name: 'maleAge', label: "Partner's Age", type: 'number' },
      { name: 'prevChildWeight', label: 'Previous Child Weight (grams)', type: 'number' },

      // ── Family History chip group ────────────────────────────────────────────
      {
        name: 'familyHistoryGroup',
        label: 'Family History — select all that apply (click to toggle Yes / Unsure / No)',
        type: 'chip-group',
        chips: [
          { field: 'famHistoryPreeclampsia', label: 'Preeclampsia' },
          { field: 'famHistoryCardiacDisease', label: 'Cardiac Disease' },
          { field: 'famHistoryHypertension', label: 'Hypertension' },
          { field: 'famHistoryDiabetes', label: 'Diabetes' },
          { field: 'famHistoryGestationalHypertension', label: 'Gestational Hypertension' },
          { field: 'famHistoryGestationalDiabetes', label: 'Gestational Diabetes' },
          { field: 'famHistoryAnemia', label: 'Anemia' },
          { field: 'famObeseHistory', label: 'Obesity' },
          { field: 'famHistoryAutoimmune', label: 'Autoimmune Disease' },
          { field: 'famSickleCell', label: 'Sickle Cell' },
          { field: 'famThalassemia', label: 'Thalassemia' },
          { field: 'malePreeclampsiaPrevHistory', label: "Partner's Previous Preeclampsia" },

        ]
      },

      // ── Partner info ─────────────────────────────────────────────────────────


      // ── Medical History chip group ───────────────────────────────────────────
      {
        name: 'medicalHistoryGroup',
        label: 'Personal Medical History — select all that apply',
        type: 'chip-group',
        chips: [
          { field: 'autoimmune', label: 'Autoimmune Disease' },
          { field: 'anemia', label: 'Anemia' },
          { field: 'diabetesMelitus', label: 'Diabetes Mellitus' },
          { field: 'chronicHypertension', label: 'Chronic Hypertension' },
          { field: 'chronicRenalDisease', label: 'Chronic Renal Disease' },
          { field: 'cardiacDisease', label: 'Cardiac Disease' },
          { field: 'liver', label: 'Liver Condition' },
          { field: 'thyroid', label: 'Thyroid Condition' },
          { field: 'kidney', label: 'Kidney Condition' },
          { field: 'rheumatoidArthritis', label: 'Rheumatoid Arthritis' },
          { field: 'menorrhagia', label: 'Menorrhagia' },
          { field: 'pcos', label: 'PCOS' },
          { field: 'uterineFibroids', label: 'Uterine Fibroids' },
          { field: 'hypothyroidism', label: 'Hypothyroidism' },
          { field: 'prevGynaSurgery', label: 'Previous Gynecological Surgery' },
          { field: 'contraceptives', label: 'Previous Contraceptive Use' },
        ]
      },



      // ── Obstetric History chip group ─────────────────────────────────────────
      {
        name: 'obstetricHistoryGroup',
        label: 'Obstetric History — select all that apply',
        type: 'chip-group',
        chips: [
          { field: 'pph', label: 'Postpartum Hemorrhage (PPH)' },
          { field: 'infertility', label: 'Infertility' },
          { field: 'ivf', label: 'IVF Pregnancy' },
          { field: 'eclampsiaHistory', label: 'Eclampsia' },
          { field: 'gestationalDiabetesHistory', label: 'Gestational Diabetes' },
          { field: 'gestationalHypertensionHistory', label: 'Gestational Hypertension' },
          { field: 'preeclampsiaHistory', label: 'Preeclampsia' },
          { field: 'firstPreeclampsiaHistory', label: 'Preeclampsia (1st Pregnancy)' },
          { field: 'pregnancyHistoryAnemia', label: 'Anemia in Pregnancy' },
        ]
      },

      // ── Obstetric data ───────────────────────────────────────────────────────

      { name: 'lastPeriodDate', label: 'Last Menstrual Period', type: 'date', max: new Date().toISOString().split('T')[0] },
      { name: 'estimatedDueDate', label: 'Estimated Due Date', type: 'date' },

      // ── Obstetric data with counts ───────────────────────────────────────────
      {
        name: 'miscarriage',
        label: 'Miscarriage',
        type: 'select',
        options: ['yes', 'no', 'unknown']
      },
      {
        name: 'miscarriageNum',
        label: 'Number of Miscarriages',
        type: 'number',
        min: 1,
        placeholder: 'Enter number',
        dependsOn: { field: 'miscarriage', value: 'yes' }
      },
      {
        name: 'csection',
        label: 'C-Section',
        type: 'select',
        options: ['yes', 'no', 'unknown']
      },
      {
        name: 'csectionNum',
        label: 'Number of C-Sections',
        type: 'number',
        min: 1,
        placeholder: 'Enter number',
        dependsOn: { field: 'csection', value: 'yes' }
      },
      {
        name: 'stillbirth',
        label: 'Stillbirth',
        type: 'select',
        options: ['yes', 'no', 'unknown']
      },
      {
        name: 'stillbirthNum',
        label: 'Number of Stillbirths',
        type: 'number',
        min: 1,
        placeholder: 'Enter number',
        dependsOn: { field: 'stillbirth', value: 'yes' }
      },
      {
        name: 'prolongedLabour',
        label: 'Prolonged Labour',
        type: 'select',
        options: ['yes', 'no', 'unknown']
      },
      {
        name: 'prolongedLabourHours',
        label: 'Prolonged Labour (Hours)',
        type: 'number',
        min: 1,
        placeholder: 'Enter hours',
        dependsOn: { field: 'prolongedLabour', value: 'yes' }
      },

    ]
  },

  Journey: {
    title: "Current Pregnancy Information",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date Recorded', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },

      // Fetal
      { name: 'sexOfFetus', label: 'Sex of Fetus', type: 'select', required: true, options: ['male', 'female', 'unknown'] },
      { name: 'spe', label: 'SPE Measurement (mm)', type: 'number', required: true },

      // Pregnancy complications chip group
      {
        name: 'pregnancyComplicationsGroup',
        label: 'Current Pregnancy Complications',
        type: 'chip-group',
        chips: [
          { field: 'abnormaldoppler', label: 'Abnormal Doppler' },
          { field: 'bleeding', label: 'Bleeding' },
          { field: 'eclampsia', label: 'Eclampsia' },
          { field: 'edema', label: 'Edema' },
          { field: 'malpresentation', label: 'Malpresentation' },
          { field: 'multifetalgestation', label: 'Multiple Fetal Gestation' },
          { field: 'pprom', label: 'PPROM' },
          { field: 'prom', label: 'PROM' },
          { field: 'preeclampsia', label: 'Preeclampsia' },
          { field: 'gestationaldiabetes', label: 'Gestational Diabetes' },
          { field: 'gesthypertension', label: 'Gestational Hypertension' },
          { field: 'placentaprevia', label: 'Placenta Previa' },
          { field: 'primipaternity', label: 'Primipaternity' },
        ]
      },

      // Medical conditions chip group
      {
        name: 'pregnancyMedicalGroup',
        label: 'Current Medical Conditions',
        type: 'chip-group',
        chips: [
          { field: 'anemia', label: 'Anemia' },
          { field: 'severAnemia', label: 'Severe Anemia' },
          { field: 'vitamindDeficiency', label: 'Vitamin D Deficiency' },
          { field: 'highHb', label: 'High Hemoglobin' },
          { field: 'malaria', label: 'Malaria' },
          { field: 'hookworm', label: 'Hookworm' },
        ]
      },
    ]
  },

  Lab: {
    title: "Laboratory Results",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Test Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationweek', label: 'Gestation Week', type: 'number', min: 0, max: 43 },

      // Blood Chemistry
      { name: 'alp', label: 'ALP (U/L)', type: 'number', required: true },
      { name: 'alt', label: 'ALT (U/L)', type: 'number', required: true },
      { name: 'ast', label: 'AST (U/L)', type: 'number', required: true },
      { name: 'albumin', label: 'Albumin (g/dL)', type: 'number', required: true },
      { name: 'bicarbonate', label: 'Bicarbonate (mEq/L)', type: 'number', required: true },
      { name: 'bilirubin', label: 'Bilirubin (mg/dL)', type: 'number', required: true },
      { name: 'calcium', label: 'Calcium (mg/dL)', type: 'number', required: true },
      { name: 'chloride', label: 'Chloride (mEq/L)', type: 'number', required: true },
      { name: 'creatinine', label: 'Creatinine (mg/dL)', type: 'number', required: true },
      { name: 'glutamyl', label: 'Gamma-GT (U/L)', type: 'number', required: true },
      { name: 'potassium', label: 'Potassium (mEq/L)', type: 'number', required: true },
      { name: 'sodium', label: 'Sodium (mEq/L)', type: 'number', required: true },
      { name: 'uricAcid', label: 'Uric Acid (mg/dL)', type: 'number', required: true },
      { name: 'bun', label: 'BUN (mg/dL)', type: 'number', required: true },

      // Blood Sugar Tests
      { name: 'fbs', label: 'Fasting Blood Sugar', type: 'number', required: true },
      { name: 'fbs1', label: 'FBS 1 Hour (mg/dL)', type: 'number' },
      { name: 'fbs2', label: 'FBS 2 Hour (mg/dL)', type: 'number' },
      { name: 'hba1c', label: 'HbA1c', type: 'select', required: true, options: ['normal', 'prediabetic', 'diabetic'] },
      { name: 'hba1c_value', label: 'HbA1c Value (%)', type: 'number', dependsOn: { field: 'hba1c', value: ['prediabetic', 'diabetic'] } },
      { name: 'randombloodsugar', label: 'Random Blood Sugar (mg/dL)', type: 'number', required: true },

      // Hematology
      { name: 'ht', label: 'Hematocrit (%)', type: 'number', required: true },
      { name: 'leukocyte', label: 'Leukocyte Count (/μL)', type: 'number', required: true },
      { name: 'haemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', required: true },
      { name: 'mch', label: 'MCH (pg)', type: 'number', required: true },
      { name: 'mchc', label: 'MCHC (g/dL)', type: 'number', required: true },
      { name: 'mcv', label: 'MCV (fL)', type: 'number', required: true },
      { name: 'platelets', label: 'Platelets (/μL)', type: 'number', required: true },
      { name: 'rbc', label: 'RBC (M/μL)', type: 'number', required: true },
      { name: 'wbc', label: 'WBC (/μL)', type: 'number', required: true },

      // Thyroid Function
      { name: 't3', label: 'T3 (ng/dL)', type: 'number', required: true },
      { name: 't4', label: 'T4 (μg/dL)', type: 'number', required: true },
      { name: 'tsh', label: 'TSH (mIU/L)', type: 'number', required: true },

      // Urine Analysis
      { name: 'ketones', label: 'Ketones', type: 'select', required: true, options: ['negative', '+', '++', '+++'] },
      { name: 'clarity', label: 'Clarity', type: 'select', required: true, options: ['clear', 'slightly cloudy', 'cloudy', 'turbid'] },
      { name: 'sg', label: 'Specific Gravity', type: 'number', required: true },
      { name: 'ph', label: 'pH', type: 'number', required: true },
      { name: 'urineColor', label: 'Urine Color', type: 'select', required: true, options: ['pale yellow', 'yellow', 'dark yellow', 'amber', 'red', 'brown'] },
      { name: 'urineGlucose', label: 'Urine Glucose', type: 'select', required: true, options: ['Negative', '+', '++', '+++'] },
      { name: 'urineNitrite', label: 'Urine Nitrite', type: 'select', required: true, options: ['Negative', 'Positive'] },
      { name: 'urineOdor', label: 'Urine Odor', type: 'select', required: true, options: ['normal', 'sweet', 'fishy', 'ammonia', 'foul'] },
      { name: 'urineProtein', label: 'Urine Protein', type: 'select', required: true, options: ['negative', '+', '++', '+++'] },

      // Diagnosis
      // { name: 'diagnosis', label: 'Diagnosis', type: 'textarea', required: true, placeholder: 'Clinical diagnosis based on results' },
      // { name: 'diagnosisId', label: 'Diagnosis ID', type: 'text' }
    ]
  },

  Notes: {
    title: "Clinical Notes",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },
      { name: 'title', label: 'Title', type: "text" },
      { name: 'notes', label: 'Clinical Notes', type: 'textarea', required: true, placeholder: 'Enter clinical notes here...' },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
    ]
  },

  Infection: {
    title: "Infection Screening",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Test Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'hiv', label: 'HIV Status', type: 'select', required: true, options: ['negative', 'positive', 'unknown'] },
      { name: 'syphilis', label: 'Syphilis', type: 'select', required: true, options: ['negative', 'positive', 'unknown'] },
      { name: 'hepB', label: 'Hepatitis B', type: 'select', required: true, options: ['negative', 'positive', 'unknown'] },
      { name: 'hepC', label: 'Hepatitis C', type: 'select', required: true, options: ['negative', 'positive', 'unknown'] },
      { name: 'rubella', label: 'Rubella Immunity', type: 'select', required: true, options: ['immune', 'non-immune', 'unknown'] }
    ]
  },

  Lifestyle: {
    title: "Lifestyle Assessment",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Assessment Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'smoking', label: 'Smoking', type: 'select', required: true, options: ['yes', 'no', 'former'] },
      { name: 'alcoholConsumption', label: 'Alcohol Consumption', type: 'select', required: true, options: ['none', 'occasional', 'regular'] },
      { name: 'diet', label: 'Diet Quality', type: 'select', required: true, options: ['poor', 'fair', 'good', 'excellent'] },
      { name: 'exercise', label: 'Exercise (minutes/week)', type: 'number', required: true },
      { name: 'caffeine', label: 'Caffeine Consumption', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'caffeineQuantity', label: 'Caffeine Quantity', type: 'text', placeholder: 'e.g., 2 cups/day', dependsOn: { field: 'caffeine', value: 'yes' } },
      { name: 'sugarDrink', label: 'Sugar Drinks', type: 'select', required: true, options: ['yes', 'no'] }
    ]
  },

  Fetal: {
    title: "Fetal Development",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      {
        name: 'date', label: 'Assessment Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0]
      },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
      { name: 'fhr', label: 'Fetal Heart Rate (bpm)', type: 'number', required: true },
      { name: 'femurHeight', label: 'Femur Length (mm)', type: 'number', required: true },
      { name: 'headCircumference', label: 'Head Circumference (cm)', type: 'number', required: true }
    ]
  },

  Ultrasound: {
    title: "Ultrasound Results",
    fields: [
      { name: 'editor', label: 'Performed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Ultrasound Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
      { name: 'amniotic', label: 'Amniotic Fluid Index', type: 'number', required: true },
      { name: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'URL to ultrasound image' }
    ]
  },

  Prescription: {
    title: "Medication Prescription",
    fields: [
      { name: 'editor', label: 'Prescribed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Prescription Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },
      { name: 'trimester', label: 'Trimester', type: 'select', required: true, options: ['1', '2', '3'] },
      { name: 'medicine', label: 'Medicine Name', type: 'text', required: true, placeholder: 'e.g., Folic Acid' },
      { name: 'dosage', label: 'Dosage', type: 'text', required: true, placeholder: 'e.g., 400mcg' },
      { name: 'prescription', label: 'Prescription Instructions', type: 'text', required: true, placeholder: 'e.g., Once daily' },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'stopDate', label: 'Stop Date', type: 'date' },
      { name: 'medicationPurpose', label: 'Purpose', type: 'textarea', required: true, placeholder: 'Purpose of medication' }
    ]
  }
};
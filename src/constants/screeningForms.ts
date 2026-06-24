interface ChipOption {
  field: string;
  label: string;
  countField?: string;
  countLabel?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'chip-group' | 'image';
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
  noPageBreak?: boolean;
  /** When false, field is used for UX only and is not sent to the API (default true). */
  persist?: boolean;

  dependsOn?: {
    field: string;
    value: any | any[];
  };
}

// ── Lifestyle field helper text ─────────────────────────────────────────────
// Displayed in the form as contextual hints beneath each lifestyle field label.
export const LIFESTYLE_FIELD_INFO: Record<string, string> = {
  smoking: 'E.g. "No", "Former smoker", "5 cigarettes/day". Occasional = less than weekly.',
  alcoholConsumption: 'E.g. "No", "Occasional" (1–2 drinks/week), "Moderate" (3–7/week), "Heavy" (daily).',
  diet: '"Poor" = mostly processed/fast food. "Fair" = mixed. "Good" = mostly whole foods. "Excellent" = consistently balanced, high fruit/veg.',
  mealsPerDay: 'Typical number of main meals per day (including breakfast, lunch, dinner).',
  dietFoodKinds: 'List the foods eaten regularly, e.g. ugali, sukuma, beans, fruit, fish.',
  dietFoodKindsGroup: 'Tap each food group the patient eats regularly — Yes / No / Uncertain.',
  exercise: 'Total minutes of moderate activity per week. WHO recommends ≥150 min/week. 0 = sedentary.',
  caffeine: 'E.g. "No", "1 cup/day", "Occasional" (a few times/week). Safe limit in pregnancy ≤200 mg/day (~2 cups coffee).',
  sugarDrink: 'E.g. "No", "Occasional" (≤2/week), "Daily". Includes sodas, juices, energy drinks.',
};

// ── Edit-record type map ────────────────────────────────────────────────────
// Maps the friendly dropdown label → { tableName, formKey }
export const EDIT_RECORD_TYPES: {
  label: string;
  tableName: string;
  formKey: string;
}[] = [
    { label: 'Patient Intake', tableName: 'patients', formKey: 'Intake' },
    { label: 'Patient History', tableName: 'patientHistory', formKey: 'History' },
    { label: 'Triage', tableName: 'triage', formKey: 'Triage' },
    { label: 'Pregnancy Journey', tableName: 'currentPregnancyInfo', formKey: 'Journey' },
    { label: 'Lab Tests', tableName: 'labwork', formKey: 'Lab' },
    { label: 'Infection Screening', tableName: 'infections', formKey: 'Infection' },
    { label: 'Lifestyle', tableName: 'patientLifestyle', formKey: 'Lifestyle' },
    { label: 'Allergy Records', tableName: 'allergies', formKey: 'Allergy' },
    { label: 'Fetal Development', tableName: 'fetalInfo', formKey: 'Fetal' },
    { label: 'Ultrasound', tableName: 'ultrasounds', formKey: 'Ultrasound' },
    { label: 'Prescriptions', tableName: 'medications', formKey: 'Prescription' },
    { label: 'Patient Visits', tableName: 'visits', formKey: 'Visits' },
  ];

export const SCREENING_FORMS: Record<string, { title: string; fields: FormField[] }> = {
  Intake: {
    title: "Patient Intake",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },

      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },

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
        name: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'nationalId',
        label: 'National ID',
        type: 'text',
        minLength: 8,
        maxLength: 8,
        patternMessage: 'National ID must be exactly 8 digits'
      },

      {
        name: 'bloodgroup',
        label: 'Blood Group',
        type: 'select',
        required: true,
        options: ['A', 'B', 'AB', 'O', 'Unknown']
      },

      {
        name: 'rh',
        label: 'RH Factor',
        type: 'select',
        required: true,
        options: ['+', '-', 'Unknown']
      },

      {
        name: 'hospital',
        label: 'Hospital',
        type: 'select',
        required: true,
        options: []
      },

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

      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'occupation', label: 'Occupation', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },

      {
        name: 'race',
        label: 'Race / Ethnicity',
        type: 'select',
        options: [
          'Black / African',
          'Asian',
          'White / Caucasian',
          'Mixed / Multiracial',
          'Middle Eastern',
          'Indigenous / Native',
          'Prefer not to say'
        ]
      },

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

      {
        name: 'emergencyContactRelationship',
        label: 'Relationship with Emergency Contact',
        type: 'text'
      }
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
          'Postnatal Visit'
        ]
      },
      
      {
        name: 'visitExplanation',
        label: 'Visit Explanation',
        type: 'textarea',
        required: true,
        placeholder: 'Detailed explanation of visit',
        noPageBreak: true
      },

      {
        name: 'gestationWeek',
        label: 'Gestation Week',
        type: 'number',
        required: true,
        min: 0,
        max: 43
      },
      { name: 'date', label: 'Visit Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },




      { name: 'nextVisit', label: 'Next Visit Date', type: 'date' },

      {
        name: 'examination',
        label: 'Examination Findings',
        type: 'textarea',
        placeholder: 'Physical examination findings, observations...',
        noPageBreak: true
      },

      {
        name: 'plan',
        label: 'Plan',
        type: 'textarea',
        placeholder: 'Management plan, follow-up actions, referrals...',
        noPageBreak: true
      },

    ]
  },

  Allergy: {
    title: "Allergy Information",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      { name: 'date', label: 'Date Recorded', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },

      { name: 'allergyType', label: 'Allergy Type', type: 'select', required: true, options: ['medication', 'food', 'environmental', 'other'] },

      { name: 'allergies', label: 'Allergies', type: 'text', required: true, placeholder: 'List allergies' }
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
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date Recorded', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },

      {
        name: 'gravida',
        label: 'Gravida',
        type: 'number',
        required: true,
        min: 1,
        placeholder: 'Total pregnancies including current (e.g. 2)',
      },
      {
        name: 'parityNotation',
        label: 'Parity',
        type: 'text',
        required: true,
        placeholder: 'e.g. 0+1 (viable≥28wks + loss before 28wks)',
        pattern: /^\d+\+\d+$/,
        patternMessage: 'Parity format: viable+loss (e.g. 0+1 for miscarriage, 1+0 if current pregnancy ≥28 weeks)',
      },

      { name: 'interval', label: 'Pregnancy Interval (months)', type: 'number' },

      { name: 'prevChildWeight', label: 'Previous Child Weight (grams)', type: 'number' },

      { name: 'lastPeriodDate', label: 'Last Menstrual Period', type: 'date', max: new Date().toISOString().split('T')[0] },

      { name: 'estimatedDueDate', label: 'Estimated Due Date', type: 'date' },

      {
        name: 'maleAge',
        label: "Partner's Age (optional)",
        type: 'number',
        required: false,
        min: 0,
        max: 99,
        placeholder: 'Leave blank if not disclosed',
      },
      {
        name: 'partnerHadPreviousPartner',
        label: 'Has your partner had a previous partner?',
        type: 'select',
        required: true,
        persist: false,
        options: ['yes', 'no'],
      },
      {
        name: 'malePreeclampsiaPrevHistory',
        label: "Did your partner's previous partner have preeclampsia during that pregnancy?",
        type: 'select',
        required: true,
        noPageBreak: true,
        options: ['yes', 'no', 'unknown'],
        dependsOn: { field: 'partnerHadPreviousPartner', value: 'yes' },
      },

      {
        name: 'prevPEHistoryDisclosure',
        label: 'Previous Preeclampsia History (self-reported)',
        type: 'select',
        required:true,
        options: ['yes', 'no', 'unknown', 'prefer not to say'],
      },

      {
        name: 'miscarriage',
        label: 'Miscarriage',
        type: 'select',
        required:true,
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
        required:true,
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
        required:true,
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
        required:true,
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

      {
        name: 'prevGynaSurgery',
        label: 'Previous Gynecological Surgery',
        type: 'select',
        required:true,
        noPageBreak:true,
        options: ['yes', 'no', 'unknown']
      },

      {
        name: 'prevGynaSurgeryDetails',
        label: 'Which gynecological surgery?',
        type: 'text',
        placeholder: 'e.g. myomectomy, hysteroscopy',
        dependsOn: { field: 'prevGynaSurgery', value: 'yes' }
      },

      {
        name: 'contraceptives',
        label: 'Previous Contraceptive Use',
        type: 'select',
        noPageBreak: true,
        options: ['yes', 'no', 'unknown']
      },

      {
        name: 'contraceptivesDetails',
        label: 'Which contraceptive(s)?',
        type: 'text',
        noPageBreak: true,
        placeholder: 'e.g. oral pills, IUD, implant',
        dependsOn: { field: 'contraceptives', value: 'yes' }
      },

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
          { field: 'famObeseHistory', label: 'Obesity (BMI ≥ 30)' },
          { field: 'famHistoryAutoimmune', label: 'Autoimmune Disease' },
          { field: 'famSickleCell', label: 'Sickle Cell' },
          { field: 'famThalassemia', label: 'Thalassemia' },
        ]
      },

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
          { field: 'hyperthyroidism', label: 'Hyperthyroidism' },
          { field: 'kidney', label: 'Kidney Condition' },
          { field: 'rheumatoidArthritis', label: 'Rheumatoid Arthritis' },
          { field: 'menorrhagia', label: 'Menorrhagia' },
          { field: 'pcos', label: 'PCOS' },
          { field: 'uterineFibroids', label: 'Uterine Fibroids' },
          { field: 'hypothyroidism', label: 'Hypothyroidism' }
        ]
      },

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
          { field: 'pregnancyHistoryAnemia', label: 'Anemia in Pregnancy' }
        ]
      }
    ]
  },

  Journey: {
    title: "Current Pregnancy Information",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Date Recorded',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'gestationWeek',
        label: 'Gestation Week',
        type: 'number',
        required: true,
        min: 0,
        max: 43
      },

      {
        name: 'sexOfFetus',
        label: 'Sex of Fetus',
        type: 'select',
        required: true,
        options: ['male', 'female', 'unknown']
      },
      {
        name: 'spe',
        label: 'SPE Measurement (mm)',
        type: 'number',
        required: true
      },

      {
        name: 'multifetalgestation',
        label: 'Multiple Fetal Gestation',
        type: 'select',
        options: ['yes', 'no', 'unknown']
      },

      {
        name: 'multifetalgestationCount',
        label: 'Number of Fetuses',
        type: 'number',
        min: 2,
        placeholder: 'e.g. 3',
        dependsOn: { field: 'multifetalgestation', value: 'yes' }
      },

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
          { field: 'pprom', label: 'PPROM' },
          { field: 'prom', label: 'PROM' },
          { field: 'preeclampsia', label: 'Preeclampsia' },
          { field: 'gestationaldiabetes', label: 'Gestational Diabetes' },
          { field: 'gesthypertension', label: 'Gestational Hypertension' },
          { field: 'placentaprevia', label: 'Placenta Previa' },
          { field: 'primipaternity', label: 'Primipaternity' }
        ]
      },



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
          { field: 'hookworm', label: 'Hookworm' }
        ]
      }
    ]
  },

  Lab: {
    title: "Laboratory Results",
    fields: [
      // Patient Information
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
      { name: 'urineProtein', label: 'Urine Protein', type: 'select', required: true, options: ['negative', '+', '++', '+++'] }
    ]
  },

  Notes: {
    title: "Clinical Notes",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      { name: 'date', label: 'Date', type: 'date', required: true, max: new Date().toISOString().split('T')[0] },

      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true, min: 0, max: 43 },

      {
        name: 'noteType',
        label: 'Note Type',
        type: 'select',
        required: true,
        options: ['Examination', 'Plan', 'Assessment', 'Follow-up', 'Referral', 'General Note']
      },

      {
        name: 'notes',
        label: 'Clinical Notes',
        type: 'textarea',
        required: true,
        placeholder: 'Enter clinical notes here...',
        // fullWidth: true
      }
    ]
  },

  Infection: {
    title: "Infection Screening",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Test Date',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'hiv',
        label: 'HIV Status',
        type: 'select',
        required: true,
        options: ['negative', 'positive', 'unknown']
      },

      {
        name: 'syphilis',
        label: 'Syphilis',
        type: 'select',
        required: true,
        options: ['negative', 'positive', 'unknown']
      },

      {
        name: 'hepB',
        label: 'Hepatitis B',
        type: 'select',
        required: true,
        options: ['negative', 'positive', 'unknown']
      },

      {
        name: 'hepC',
        label: 'Hepatitis C',
        type: 'select',
        required: true,
        options: ['negative', 'positive', 'unknown']
      },

      {
        name: 'rubella',
        label: 'Rubella Immunity',
        type: 'select',
        required: true,
        options: ['immune', 'non-immune', 'unknown']
      }
    ]
  },

  Lifestyle: {
    title: "Lifestyle Assessment",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Assessment Date',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'diet',
        label: 'Diet Quality',
        type: 'select',
        required: true,
        options: ['poor', 'fair', 'good', 'excellent']
      },

      {
        name: 'mealsPerDay',
        label: 'Meals per Day',
        type: 'number',
        required: true,
        min: 1,
        max: 10,
        placeholder: 'e.g. 3',
      },

      {
        name: 'dietFoodKinds',
        label: 'Regular Foods (types & examples)',
        type: 'text',
        required: false,
        placeholder: 'e.g. ugali, sukuma, beans, fruit, fish',
      },

      {
        name: 'exercise',
        label: 'Exercise (minutes/week)',
        type: 'number',
        required: true
      },

      {
        name: 'smoking',
        label: 'Smoking',
        type: 'text',
        required: true,
        placeholder: 'e.g. no / 10 cigarettes/day / former smoker'
      },

      {
        name: 'alcoholConsumption',
        label: 'Alcohol Consumption',
        type: 'text',
        required: true,
        placeholder: 'e.g. no / 3 glasses/week'
      },

      {
        name: 'caffeine',
        label: 'Caffeine Consumption',
        type: 'text',
        required: true,
        placeholder: 'e.g. no / 2 cups/day'
      },

      {
        name: 'sugarDrink',
        label: 'Sugary Drinks',
        type: 'text',
        required: true,
        placeholder: 'e.g. no / 1 can/day'
      },

      {
        name: 'dietFoodKindsGroup',
        label: 'Food Groups Typically Eaten',
        type: 'chip-group',
        chips: [
          { field: 'dietGroupFruitsVeg', label: 'Fruits & Vegetables' },
          { field: 'dietGroupWholeGrains', label: 'Whole Grains / Staples' },
          { field: 'dietGroupProtein', label: 'Protein (meat, fish, eggs, legumes)' },
          { field: 'dietGroupDairy', label: 'Dairy' },
          { field: 'dietGroupProcessed', label: 'Processed / Packaged Foods' },
          { field: 'dietGroupFastFood', label: 'Fast Food / Fried Foods' },
          { field: 'dietGroupSugary', label: 'Sugary Snacks & Drinks' },
        ],
      }
    ]
  },

  Fetal: {
    title: "Fetal Development",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Assessment Date',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'gestationWeek',
        label: 'Gestation Week',
        type: 'number',
        required: true,
        min: 0,
        max: 43
      },

      {
        name: 'fhr',
        label: 'Fetal Heart Rate (bpm)',
        type: 'number',
        required: true
      },

      {
        name: 'femurHeight',
        label: 'Femur Length (mm)',
        type: 'number',
        required: true
      },

      {
        name: 'headCircumference',
        label: 'Head Circumference (cm)',
        type: 'number',
        required: true
      }
    ]
  },

  Ultrasound: {
    title: "Ultrasound Results",
    fields: [
      { name: 'editor', label: 'Performed By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Ultrasound Date',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'gestationWeek',
        label: 'Gestation Week',
        type: 'number',
        required: true,
        min: 0,
        max: 43
      },

      {
        name: 'amniotic',
        label: 'Amniotic Fluid Index',
        type: 'number',
        required: true
      },

      {
        name: 'imageUrl',
        label: 'Ultrasound Image',
        type: 'image',
        required: true,
      }
    ]
  },

  Prescription: {
    title: "Medication Prescription",
    fields: [
      { name: 'editor', label: 'Prescribed By', type: 'text', required: true, readonly: true },

      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },

      {
        name: 'date',
        label: 'Prescription Date',
        type: 'date',
        required: true,
        max: new Date().toISOString().split('T')[0]
      },

      {
        name: 'gestationWeek',
        label: 'Gestation Week',
        type: 'number',
        required: true,
        min: 0,
        max: 43
      },

      {
        name: 'trimester',
        label: 'Trimester',
        type: 'select',
        required: true,
        options: ['1', '2', '3']
      },

      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true
      },

      {
        name: 'medicine',
        label: 'Medicine Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Folic Acid'
      },

      {
        name: 'dosage',
        label: 'Dosage',
        type: 'text',
        required: true,
        placeholder: 'e.g., 400mcg'
      },

      {
        name: 'prescription',
        label: 'Prescription Instructions',
        type: 'text',
        required: true,
        placeholder: 'e.g., Once daily'
      },

      {
        name: 'stopDate',
        label: 'Stop Date',
        type: 'date'
      },

      {
        name: 'medicationPurpose',
        label: 'Purpose',
        type: 'textarea',
        required: true,
        placeholder: 'Purpose of medication',
        noPageBreak: true
      }
    ]
  }
};
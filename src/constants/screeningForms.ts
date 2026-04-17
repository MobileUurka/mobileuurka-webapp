export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  readonly?: boolean;
}

export const SCREENING_FORMS: Record<string, { title: string; fields: FormField[] }> = {
  Intake: {
    title: "Patient Intake",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'phone', label: 'Phone Number', type: 'text', required: true },
      { name: 'nationalId', label: 'National ID', type: 'text', required: false },
      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'address', label: 'Address', type: 'text' },

      // Emergency Contact (nested JSON flattened)
      { name: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text' },
      { name: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'text' },
      { name: 'emergencyContactRelationship', label: 'Relationship', type: 'text' },

      { name: 'insurance', label: 'Insurance Provider', type: 'text' },
      { name: 'occupation', label: 'Occupation', type: 'text' },

      { name: 'bloodgroup', label: 'Blood Group', type: 'select', required: true, options: ['A', 'B', 'AB', 'O'] },
      { name: 'rh', label: 'RH Factor', type: 'select', required: true, options: ['+', '-'] },

      { name: 'race', label: 'Race / Ethnicity', type: 'text' },
      { name: 'hospital', label: 'Hospital', type: 'select', required: true, options: [] } // Will be populated dynamically
    ]
  },

  Visits: {
    title: "Patient Visit Information",
    fields: [
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'visitNumber', label: 'Visit Number', type: 'number', required: true },
      { name: 'visitReason', label: 'Visit Reason', type: 'text', required: true, placeholder: 'Reason for visit' },
      { name: 'visitExplanation', label: 'Visit Explanation', type: 'textarea', required: true, placeholder: 'Detailed explanation of visit' },
      { name: 'editor', label: 'Doctor/Editor', type: 'text', required: true, readonly: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
      { name: 'date', label: 'Visit Date', type: 'date', required: true },
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
      { name: 'date', label: 'Date Recorded', type: 'date', required: true }
    ]
  },

  Triage: {
    title: "Triage Assessment",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Assessment Date', type: 'date', required: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
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
      { name: 'date', label: 'Date Recorded', type: 'date', required: true },
      { name: 'famHistoryPreeclampsia', label: 'Family History: Preeclampsia', type: 'select', required: true, options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryCardiacDisease', label: 'Family History: Cardiac Disease', type: 'select', required: true, options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryHypertension', label: 'Family History: Hypertension', type: 'select', required: true, options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryDiabetes', label: 'Family History: Diabetes', type: 'select', required: true, options: ['yes', 'no', 'unknown'] },
      { name: 'autoimmune', label: 'Autoimmune Disease', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'anemia', label: 'Anemia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'diabetesMelitus', label: 'Diabetes Mellitus', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'chronicHypertension', label: 'Chronic Hypertension', type: 'select', options: ['yes', 'no'] },
      { name: 'gravida', label: 'Gravida', type: 'number', required: true },
      { name: 'parity', label: 'Parity', type: 'number', required: true },
      { name: 'miscarriage', label: 'Previous Miscarriage', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'csection', label: 'Previous C-Section', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'preeclampsiaHistory', label: 'Previous Preeclampsia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'gestationalDiabetesHistory', label: 'Previous Gestational Diabetes', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'famHistoryGestationalHypertension', label: 'Family History: Gestational Hypertension', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryGestationalDiabetes', label: 'Family History: Gestational Diabetes', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryAnemia', label: 'Family History: Anemia', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famObeseHistory', label: 'Family History: Obesity', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famHistoryAutoimmune', label: 'Family History: Autoimmune Disease', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famSickleCell', label: 'Family History: Sickle Cell', type: 'select', options: ['yes', 'no', 'unknown'] },
      { name: 'famThalassemia', label: 'Family History: Thalassemia', type: 'select', options: ['yes', 'no', 'unknown'] },

      { name: 'maleAge', label: 'Father Age', type: 'number' },
      { name: 'malePreeclampsiaPrevHistory', label: 'Father Previous Preeclampsia History', type: 'select', options: ['yes', 'no', 'unknown'] },

      { name: 'liver', label: 'Liver Condition', type: 'select', options: ['normal', 'abnormal'] },
      { name: 'thyroid', label: 'Thyroid Condition', type: 'select', options: ['normal', 'abnormal'] },
      { name: 'cardiacDisease', label: 'Cardiac Disease', type: 'select', options: ['yes', 'no'] },
      { name: 'chronicRenalDisease', label: 'Chronic Renal Disease', type: 'select', options: ['yes', 'no'] },
      { name: 'kidney', label: 'Kidney Condition', type: 'select', options: ['normal', 'abnormal'] },
      { name: 'rheumatoidArthritis', label: 'Rheumatoid Arthritis', type: 'select', options: ['yes', 'no'] },

      { name: 'menorrhagia', label: 'Menorrhagia', type: 'select', options: ['yes', 'no'] },
      { name: 'pcos', label: 'PCOS', type: 'select', options: ['yes', 'no'] },
      { name: 'uterineFibroids', label: 'Uterine Fibroids', type: 'select', options: ['yes', 'no'] },
      { name: 'hypothyroidism', label: 'Hypothyroidism', type: 'select', options: ['yes', 'no'] },

      { name: 'interval', label: 'Pregnancy Interval (months)', type: 'number' },
      { name: 'lastPeriodDate', label: 'Last Menstrual Period', type: 'date' },
      { name: 'estimatedDueDate', label: 'Estimated Due Date', type: 'date' },

      { name: 'miscarriageNum', label: 'Number of Miscarriages', type: 'number' },
      { name: 'csectionNum', label: 'Number of C-Sections', type: 'number' },

      { name: 'stillbirth', label: 'Previous Stillbirth', type: 'select', options: ['yes', 'no'] },
      { name: 'stillbirthNum', label: 'Number of Stillbirths', type: 'number' },

      { name: 'pph', label: 'Postpartum Hemorrhage History', type: 'select', options: ['yes', 'no'] },

      { name: 'infertility', label: 'History of Infertility', type: 'select', options: ['yes', 'no'] },
      { name: 'ivf', label: 'IVF Pregnancy', type: 'select', options: ['yes', 'no'] },

      { name: 'eclampsiaHistory', label: 'History of Eclampsia', type: 'select', options: ['yes', 'no'] },
      { name: 'gestationalHypertensionHistory', label: 'History of Gestational Hypertension', type: 'select', options: ['yes', 'no'] },
      { name: 'firstPreeclampsiaHistory', label: 'First Pregnancy Preeclampsia', type: 'select', options: ['yes', 'no', 'unknown'] },

      { name: 'prevChildWeight', label: 'Previous Child Weight (grams)', type: 'number' },
      { name: 'prevGynaSurgery', label: 'Previous Gynecological Surgery', type: 'text' },

      { name: 'prolongedLabour', label: 'History of Prolonged Labour', type: 'select', options: ['yes', 'no'] },
      { name: 'prolongedLabourHours', label: 'Prolonged Labour Duration (hours)', type: 'number' },

      { name: 'contraceptives', label: 'Previous Contraceptive Use', type: 'text' },

      { name: 'pregnancyHistoryAnemia', label: 'Anemia During Previous Pregnancy', type: 'select', options: ['yes', 'no'] }
    ]
  },

  Journey: {
    title: "Current Pregnancy Information",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date Recorded', type: 'date', required: true },
      { name: 'gestationweek', label: 'Gestation Week', type: 'number', required: true },

      // Pregnancy Complications
      { name: 'abnormaldoppler', label: 'Abnormal Doppler', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'bleeding', label: 'Bleeding', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'eclampsia', label: 'Eclampsia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'edema', label: 'Edema', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'malpresentation', label: 'Malpresentation', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'multifetalgestation', label: 'Multiple Fetal Gestation', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'pprom', label: 'PPROM', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'prom', label: 'PROM', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'preeclampsia', label: 'Preeclampsia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'gestationaldiabetes', label: 'Gestational Diabetes', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'gesthypertension', label: 'Gestational Hypertension', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'placentaprevia', label: 'Placenta Previa', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'primipaternity', label: 'Primipaternity', type: 'select', required: true, options: ['yes', 'no'] },

      // Fetal Information
      { name: 'sexOfFetus', label: 'Sex of Fetus', type: 'select', required: true, options: ['male', 'female', 'unknown'] },
      { name: 'spe', label: 'SPE Measurement (mm)', type: 'number', required: true },

      // Medical Conditions
      { name: 'anemia', label: 'Anemia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'malaria', label: 'Malaria', type: 'select', options: ['yes', 'no'] },
      { name: 'hookworm', label: 'Hookworm', type: 'select', options: ['yes', 'no'] },
      { name: 'vitamindDeficiency', label: 'Vitamin D Deficiency', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'severAnemia', label: 'Severe Anemia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'highHb', label: 'High Hemoglobin', type: 'select', required: true, options: ['yes', 'no'] }
    ]
  },

  Lab: {
    title: "Laboratory Results",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Test Date', type: 'date', required: true },
      { name: 'gestationweek', label: 'Gestation Week', type: 'number' },

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
      { name: 'hba1c_value', label: 'HbA1c Value (%)', type: 'number' },
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

  Notes:{
    title:"Clinical Notes",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },
      { name: 'title', label:'Title', type:"text" },
      { name: 'notes', label: 'Clinical Notes', type: 'textarea', required: true, placeholder: 'Enter clinical notes here...' },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
    ]
  },

  Infection: {
    title: "Infection Screening",
    fields: [
      { name: 'editor', label: 'Tested By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Test Date', type: 'date', required: true },
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
      { name: 'date', label: 'Assessment Date', type: 'date', required: true },
      { name: 'smoking', label: 'Smoking', type: 'select', required: true, options: ['yes', 'no', 'former'] },
      { name: 'alcoholConsumption', label: 'Alcohol Consumption', type: 'select', required: true, options: ['none', 'occasional', 'regular'] },
      { name: 'diet', label: 'Diet Quality', type: 'select', required: true, options: ['poor', 'fair', 'good', 'excellent'] },
      { name: 'exercise', label: 'Exercise (minutes/week)', type: 'number', required: true },
      { name: 'caffeine', label: 'Caffeine Consumption', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'caffeineQuantity', label: 'Caffeine Quantity', type: 'text', placeholder: 'e.g., 2 cups/day' },
      { name: 'sugarDrink', label: 'Sugar Drinks', type: 'select', required: true, options: ['yes', 'no'] }
    ]
  },

  Fetal: {
    title: "Fetal Development",
    fields: [
      { name: 'editor', label: 'Assessed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Assessment Date', type: 'date', required: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
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
      { name: 'date', label: 'Ultrasound Date', type: 'date', required: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
      { name: 'amniotic', label: 'Amniotic Fluid Index', type: 'number', required: true },
      { name: 'imageUrl', label: 'Image URL', type: 'text', placeholder: 'URL to ultrasound image' }
    ]
  },

  Prescription: {
    title: "Medication Prescription",
    fields: [
      { name: 'editor', label: 'Prescribed By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Prescription Date', type: 'date', required: true },
      { name: 'gestationWeek', label: 'Gestation Week', type: 'number', required: true },
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
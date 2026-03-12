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
      { name: 'bleeding', label: 'Bleeding', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'edema', label: 'Edema', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'preeclampsia', label: 'Preeclampsia', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'gestationaldiabetes', label: 'Gestational Diabetes', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'gesthypertension', label: 'Gestational Hypertension', type: 'select', required: true, options: ['yes', 'no'] },
      { name: 'anemia', label: 'Anemia', type: 'select', required: true, options: ['none', 'mild', 'moderate', 'severe'] },
      { name: 'malpresentation', label: 'Fetal Presentation', type: 'select', required: true, options: ['cephalic', 'breech', 'transverse'] },
      { name: 'sexOfFetus', label: 'Sex of Fetus', type: 'select', options: ['male', 'female', 'unknown'] },
      { name: 'multifetalgestation', label: 'Multiple Gestation', type: 'select', required: true, options: ['yes', 'no'] },

      
    ]
  },

  Lab: {
    title: "Laboratory Results",
    fields: [
      { name: 'editor', label: 'Recorded By', type: 'text', required: true, readonly: true },
      { name: 'patientId', label: 'Patient', type: 'text', required: true, placeholder: 'Select patient from list' },
      { name: 'date', label: 'Test Date', type: 'date', required: true },
      { name: 'gestationweek', label: 'Gestation Week', type: 'number', required: true },
      { name: 'haemoglobin', label: 'Haemoglobin (g/dL)', type: 'number', required: true },
      { name: 'platelets', label: 'Platelets', type: 'number', required: true },
      { name: 'creatinine', label: 'Creatinine', type: 'number', required: true },
      { name: 'alt', label: 'ALT', type: 'number', required: true },
      { name: 'ast', label: 'AST', type: 'number', required: true },
      { name: 'urineProtein', label: 'Urine Protein', type: 'select', required: true, options: ['negative', '+', '++', '+++', '++++'] },
      { name: 'fbs', label: 'Fasting Blood Sugar', type: 'select', required: true, options: ['normal', 'elevated'] },
      { name: 'diagnosis', label: 'Diagnosis', type: 'textarea', required: true, placeholder: 'Clinical diagnosis based on results' }
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
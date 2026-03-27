import React from "react";
import { IoArrowBackOutline } from "react-icons/io5";

interface DocumentProps {
  document: any;
  title?: string;
  onBack?: () => void;
}

// Format object keys into readable labels
const formatKey = (key: string): string => {
  // Handle specific medical field names
  const fieldMappings: Record<string, string> = {
    'gestationweek': 'Gestation Week',
    'abnormaldoppler': 'Abnormal Doppler',
    'multifetalgestation': 'Multifetal Gestation',
    'pprom': 'PPROM',
    'prom': 'PROM',
    'gestationaldiabetes': 'Gestational Diabetes',
    'gesthypertension': 'Gestational Hypertension',
    'placentaprevia': 'Placenta Previa',
    'primipaternity': 'Primipaternity',
    'sexOfFetus': 'Sex of Fetus',
    'vitamindDeficiency': 'Vitamin D Deficiency',
    'severAnemia': 'Severe Anemia',
    'highHb': 'High Hemoglobin',
    'alp': 'ALP',
    'alt': 'ALT',
    'ast': 'AST',
    'glutamyl': 'Gamma-GT',
    'uricAcid': 'Uric Acid',
    'bun': 'BUN',
    'fbs': 'FBS',
    'fbs1': 'FBS 1hr',
    'fbs2': 'FBS 2hr',
    'hba1c': 'HbA1c',
    'hba1cValue': 'HbA1c Value',
    'randombloodsugar': 'Random Blood Sugar',
    'ht': 'Hematocrit',
    'haemoglobin': 'Hemoglobin',
    'mch': 'MCH',
    'mchc': 'MCHC',
    'mcv': 'MCV',
    'rbc': 'RBC',
    'wbc': 'WBC',
    't3': 'T3',
    't4': 'T4',
    'tsh': 'TSH',
    'sg': 'Specific Gravity',
    'ph': 'pH',
    'urineColor': 'Urine Color',
    'urineGlucose': 'Urine Glucose',
    'urineNitrite': 'Urine Nitrite',
    'urineOdor': 'Urine Odor',
    'urineProtein': 'Urine Protein',
    'diagnosisId': 'Diagnosis ID'
  };

  if (fieldMappings[key]) {
    return fieldMappings[key];
  }

  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

// Helper function to format values with medical units
const formatValue = (value: any, label: string): string => {
  if (value === -1 || value === "-1") return "Unknown";
  if (value === null || value === "" || value === undefined) return "—";

  const stringValue = String(value);
  const lowerLabel = label.toLowerCase();

  // Basic measurements
  if (lowerLabel.includes("height") && !stringValue.includes("cm")) return `${stringValue} cm`;
  if (lowerLabel.includes("weight") && !stringValue.includes("kg")) return `${stringValue} kg`;
  if (lowerLabel.includes("temperature") && !stringValue.includes("°")) return `${stringValue}°C`;
  if (lowerLabel.includes("pressure") && stringValue.includes("/")) return `${stringValue} mmHg`;

  // Lab values with units
  if (lowerLabel.includes("gestationweek")) return `${stringValue} weeks`;
  
  // Blood chemistry units
  if (lowerLabel.includes("alp") || lowerLabel.includes("alt") || lowerLabel.includes("ast")) return `${stringValue} U/L`;
  if (lowerLabel.includes("albumin")) return `${stringValue} g/dL`;
  if (lowerLabel.includes("bilirubin")) return `${stringValue} mg/dL`;
  if (lowerLabel.includes("calcium")) return `${stringValue} mg/dL`;
  if (lowerLabel.includes("creatinine")) return `${stringValue} mg/dL`;
  if (lowerLabel.includes("potassium") || lowerLabel.includes("sodium") || lowerLabel.includes("chloride") || lowerLabel.includes("bicarbonate")) return `${stringValue} mEq/L`;
  if (lowerLabel.includes("uric")) return `${stringValue} mg/dL`;
  if (lowerLabel.includes("bun")) return `${stringValue} mg/dL`;
  
  // Blood sugar units
  if (lowerLabel.includes("fbs") || lowerLabel.includes("randombloodsugar")) return `${stringValue} mg/dL`;
  if (lowerLabel.includes("hba1c") && !lowerLabel.includes("value")) return `${stringValue}%`;
  
  // Hematology units
  if (lowerLabel.includes("haemoglobin")) return `${stringValue} g/dL`;
  if (lowerLabel.includes("ht")) return `${stringValue}%`;
  if (lowerLabel.includes("leukocyte") || lowerLabel.includes("wbc")) return `${stringValue} /μL`;
  if (lowerLabel.includes("rbc")) return `${stringValue} M/μL`;
  if (lowerLabel.includes("platelets")) return `${stringValue} /μL`;
  if (lowerLabel.includes("mch")) return `${stringValue} pg`;
  if (lowerLabel.includes("mchc")) return `${stringValue} g/dL`;
  if (lowerLabel.includes("mcv")) return `${stringValue} fL`;
  
  // Thyroid units
  if (lowerLabel.includes("t3")) return `${stringValue} ng/dL`;
  if (lowerLabel.includes("t4")) return `${stringValue} μg/dL`;
  if (lowerLabel.includes("tsh")) return `${stringValue} mIU/L`;
  
  // Urine analysis units
  if (lowerLabel.includes("sg")) return `${stringValue}`;
  if (lowerLabel.includes("ph")) return `${stringValue}`;
  
  // Pregnancy measurements
  if (lowerLabel.includes("spe")) return `${stringValue} mm`;

  return stringValue;
};

// Format date for hospital documents
const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric"
  }) + " " + date.toLocaleTimeString("en-GB", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

// Dynamic document templates based on type
const getDocumentTemplate = (title: string, items: Array<{label: string, value: string}>) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("triage")) {
    return {
      title: "Triage Assessment",
      sections: [
        {
          name: "Patient Information",
          fields: items.filter(item => 
            ["editor", "date", "patient id"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Vital Signs",
          fields: items.filter(item => 
            ["height", "weight", "blood pressure", "temperature", "pulse", "systolic", "diastolic"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Assessment",
          fields: items.filter(item => 
            !["editor", "date", "patient id", "height", "weight", "blood pressure", "temperature", "pulse", "systolic", "diastolic"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        }
      ]
    };
  }
  
  if (lowerTitle.includes("lab")) {
    return {
      title: "Laboratory Report",
      sections: [
        {
          name: "Test Information",
          fields: items.filter(item => 
            ["editor", "date", "patient id", "gestationweek", "diagnosis"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Blood Chemistry",
          fields: items.filter(item => 
            ["alp", "alt", "ast", "albumin", "bicarbonate", "bilirubin", "calcium", "chloride", "creatinine", "glutamyl", "potassium", "sodium", "uric", "bun"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Blood Sugar Tests",
          fields: items.filter(item => 
            ["fbs", "hba1c", "randombloodsugar"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Hematology",
          fields: items.filter(item => 
            ["ht", "leukocyte", "haemoglobin", "mch", "mchc", "mcv", "platelets", "rbc", "wbc"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Thyroid Function",
          fields: items.filter(item => 
            ["t3", "t4", "tsh"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Urine Analysis",
          fields: items.filter(item => 
            ["ketones", "clarity", "sg", "ph", "urine"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        }
      ]
    };
  }
  
  if (lowerTitle.includes("pregnancy")) {
    return {
      title: "Pregnancy Assessment",
      sections: [
        {
          name: "Visit Information",
          fields: items.filter(item => 
            ["editor", "date", "patient id", "gestationweek", "sex of fetus", "spe"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Pregnancy Complications",
          fields: items.filter(item => 
            ["abnormaldoppler", "bleeding", "eclampsia", "edema", "malpresentation", "multifetalgestation", "pprom", "prom", "preeclampsia", "placentaprevia", "primipaternity"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Medical Conditions",
          fields: items.filter(item => 
            ["anemia", "gestationaldiabetes", "gesthypertension", "malaria", "hookworm", "vitamind deficiency", "sever anemia", "high hb"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        }
      ]
    };
  }
  
  if (lowerTitle.includes("infection")) {
    return {
      title: "Infection Screening",
      sections: [
        {
          name: "Test Information",
          fields: items.filter(item => 
            ["editor", "date", "patient id"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        },
        {
          name: "Screening Results",
          fields: items.filter(item => 
            ["hiv", "syphilis", "hepatitis", "rubella", "hepb", "hepc", "positive", "negative"].some(field => 
              item.label.toLowerCase().includes(field)
            )
          )
        }
      ]
    };
  }
  
  // Default template
  return {
    title: "Medical Document",
    sections: [
      {
        name: "Document Information",
        fields: items.filter(item => 
          ["editor", "date", "patient id"].some(field => 
            item.label.toLowerCase().includes(field)
          )
        )
      },
      {
        name: "Details",
        fields: items.filter(item => 
          !["editor", "date", "patient id"].some(field => 
            item.label.toLowerCase().includes(field)
          )
        )
      }
    ]
  };
};

const Document: React.FC<DocumentProps> = ({ document, title, onBack }) => {
  if (!document) return null;

  // Process document data
  const transformed: Record<string, any> = { ...document };

  // Format date if present
  if (transformed.date) {
    transformed.date = formatDate(transformed.date);
  }

  // Clean up unwanted fields
  delete transformed.user_id;
  delete transformed.infections_id;

  const allItems = Object.entries(transformed).map(([key, value]) => ({
    label: formatKey(key),
    value: formatValue(value, key),
  }));

  const template = getDocumentTemplate(title || "", allItems);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white">
      {/* Back Button */}
      {onBack && (
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <IoArrowBackOutline />
            <span>Back to Documents</span>
          </button>
        </div>
      )}

      {/* Modern Document Layout */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#008540] to-[#007036] text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold mb-2">{template.title}</h1>
              <div className="text-green-100 text-sm">
                Generated on {new Date().toLocaleDateString("en-GB", { 
                  day: "2-digit", 
                  month: "long", 
                  year: "numeric" 
                })} at {new Date().toLocaleTimeString("en-GB", { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </div>
            </div>
            <div className="text-right text-green-100 text-sm">
              <div>Medical Center</div>
              <div>Patient Records</div>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="p-6">
          {template.sections.map((section, sectionIndex) => (
            section.fields.length > 0 && (
              <div key={sectionIndex} className="mb-8 last:mb-0">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {section.name}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {item.label}
                      </div>
                      <div className={`text-base ${
                        item.value === "—" || item.value === "Unknown" 
                          ? "text-gray-400 italic" 
                          : "text-gray-900 font-medium"
                      }`}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              <span className="font-medium">Physician:</span> {allItems.find(item => item.label.toLowerCase().includes('editor'))?.value || 'Not specified'}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                This document contains confidential medical information
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Document;
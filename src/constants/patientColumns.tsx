import { IoIosWarning } from 'react-icons/io';
import type { ColumnConfig } from '../components/DataTable';

// Centralized Interface
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  hospital?: string;
  nextVisit?: string;
  lastVisitDate?: string;
  [key: string]: any; // Allows for Risk and Suspected Diseases later
}

/**
 * Formats a raw Postgres array string or simple string into a readable diagnosis.
 * Example: '{"Highly Suspected Preeclampsia", "Anemia"}' -> 'Suspected to have Preeclampsia & Anemia'
 */
export const formatDiagnosis = (raw: string | null | undefined): string => {
  if (!raw || raw.trim() === "" || raw === "{}") return "No diagnosis records";

  const isNegativeResult = (s: string) =>
    /^no\b/i.test(s) ||
    /^not\b/i.test(s) ||
    /^none\b/i.test(s) ||
    /no specific conditions/i.test(s) ||
    /no condition/i.test(s) ||
    /not of any/i.test(s);

  const parsePostgresArray = (str: string): string[] => {
    if (!str.startsWith("{") || !str.endsWith("}")) return [str];
    return str
      .replace(/^{|}$/g, "")
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((item) => item.replace(/^"(.*)"$/, "$1").trim());
  };

  try {
    const parsed = parsePostgresArray(raw);

    const cleaned = parsed
      .filter((x) => x && x !== "NULL" && x.trim() !== "")
      .map((entry) =>
        entry
          .replace(/Highly\s+/i, "")
          .replace(/Suspected\s+to\s+have\s+/i, "")
          .replace(/Suspected\s+/i, "")
          .replace(/\.$/, "")
          .trim()
      );

    if (cleaned.length === 0) return "No diagnosis data found";
    if (isNegativeResult(cleaned[0])) return "No specific conditions detected";

    const positive = cleaned.filter((c) => !isNegativeResult(c));
    if (positive.length === 0) return "No specific conditions detected";

    return `Suspected to have ${positive.join(" & ")}`;

  } catch (error) {
    console.error("Diagnosis parsing error:", error);
    return "Error parsing diagnosis";
  }
};

export const PATIENT_COLUMNS: ColumnConfig<Patient>[] = [
  {
    label: "Name",
    key: "name",
    width:"240px",
    render: (patient) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#e5decb] flex items-center justify-center text-xs text-gray-700 shrink-0">
          {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
        </div>
        <span className="font-medium truncate">
          {patient.firstName} {patient.lastName}
        </span>
      </div>
    )
  },
  {
    label: "National ID",
    key: "nationalId",
    width:"120px",
    render: (patient) => {
      const id = String(patient.nationalId || "");
      return id ? `*****${id.slice(-4)}` : "—";
    }
  },
  {
    label: "Hospital",
    key: "hospital",
    width:"220px",
    render: (patient) => <span className="truncate">{patient.hospital || "—"}</span>
  },
  {
    label: "Risk Status",
    key: "riskLevel",
    width: "120px",
    render: (item: any) => {
      const riskValue = item.riskLevel;
  
      if (!riskValue) return <span className="text-gray-400">—</span>;
  
      const risk = riskValue.toLowerCase() as 'high' | 'mid' | 'low';
  
      const colors = {
        high: {
          text: "rgba(220, 38, 38, 0.9)", // red-600
          bg: "rgba(220, 38, 38, 0.08)",
        },
        mid: {
          text: "rgba(251, 191, 36, 0.9)", // yellow-400
          bg: "rgba(251, 191, 36, 0.08)",
        },
        low: {
          text: "rgba(34, 197, 94, 0.9)", // green-500
          bg: "rgba(34, 197, 94, 0.08)",
        },
        default: {
          text: "rgba(107, 114, 128, 0.9)", // gray-500
          bg: "rgba(107, 114, 128, 0.08)",
        },
      };
  
      const config = colors[risk] || colors.default;
  
      return (
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full w-fit text-xs font-medium"
          style={{
            backgroundColor: config.bg,
            color: config.text,
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: config.text,
            }}
          />
          {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </div>
      );
    },
  },
  {
    label: "Next Visit",
    key: "nextVisit",
    width: "120px",
    render: (item: any) => {
      const nextVisit = item.nextVisit;
      
      if (!nextVisit) return <span className="text-gray-400">—</span>;
      
      // Parse the date and format it nicely
      try {
        const date = new Date(nextVisit);
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format the date
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
        
        // Determine color based on urgency
        let textColor = "text-gray-700";
        let bgColor = "bg-gray-50";
        
        if (diffDays < 0) {
          // Overdue
          textColor = "text-red-700";
          bgColor = "bg-red-50";
        } else if (diffDays <= 7) {
          // Due soon
          textColor = "text-orange-700";
          bgColor = "bg-orange-50";
        } else if (diffDays <= 30) {
          // Due this month
          textColor = "text-blue-700";
          bgColor = "bg-blue-50";
        }
        
        return (
          <div className={`px-2 py-1 rounded text-xs font-medium ${textColor} ${bgColor} w-fit`}>
            {formattedDate}
          </div>
        );
      } catch (error) {
        return <span className="text-gray-400">Invalid date</span>;
      }
    },
  },
  {
    label: "Suspected Diagnosed Diseases",
    key: "suspected",
    width: "350px",
    render: (item: any) => {
      // Access the patient object inside the nested response
      const rawDiagnosis = item.diagnosis; 
      
      const formatted = formatDiagnosis(rawDiagnosis);
  
      const isEmpty =
        !rawDiagnosis ||
        formatted === "No diagnosis" ||
        formatted === "No diagnosis records" ||
        formatted === "No diagnosis data found" ||
        formatted === "Suspected to have ";
  
      return (
        <span className="flex items-center text-xs">
          {!isEmpty && (
            <IoIosWarning
              style={{
                color: "#FF9500",
                backgroundColor: "#FF950020",
                borderRadius: "50%",
                padding: "2px",
                marginRight: "8px",
                fontSize: "1.1rem",
              }}
            />
          )}
          <span className="truncate max-w-[300px]">
            {isEmpty ? "—" : formatted}
          </span>
        </span>
      );
    },
  }
];
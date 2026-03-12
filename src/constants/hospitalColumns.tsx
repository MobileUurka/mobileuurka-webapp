import type { ColumnConfig } from '../components/DataTable';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  city: string;
  state: string;
  type: string;
  totalPatients: number;
}

export const HOSPITAL_COLUMNS: ColumnConfig<Hospital>[] = [
  {
    label: "Hospital Name",
    key: "name",
    width: "30%",
    render: (hospital) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#e5decb] flex items-center justify-center text-xs text-gray-700 shrink-0">
          {hospital.name?.charAt(0)}
        </div>
        <span className="font-medium">{hospital.name}</span>
      </div>
    )
  },
  {
    label: "Location",
    key: "location",
    width: "30%",
    render: (hospital) => (
      <div className="text-sm">
        <div>{hospital.address} , {hospital.city}</div>
      </div>
    )
  },
  {
    label: "Type",
    key: "type",
    width: "15%",
    render: (hospital) => (
      <span className="capitalize">{hospital.type}</span>
    )
  },
  {
    label: "Total Patients",
    key: "totalPatients",
    width: "15%",
    render: (hospital) => (
      <span className="font-medium">{hospital.totalPatients}</span>
    )
  }
];
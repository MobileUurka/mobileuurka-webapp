import React from "react";
import Pagination from "./Pagination"; 
import { usePagination } from "../hooks/usePagination";

export interface ColumnConfig<T> {
  label: string;
  key: string;
  width?: string; 
  render?: (item: T, context?: any) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  contextData?: any;
  initialItemsPerPage?: number;
}

function DataTable<T extends { id?: string | number }>({
  columns,
  data = [],
  onRowClick,
  emptyMessage,
  contextData = {},
  initialItemsPerPage = 10,
}: DataTableProps<T>) {
  
  const {
    currentPage,
    itemsPerPage,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    getPaginatedData,
  } = usePagination({
    totalItems: data.length,
    initialItemsPerPage: initialItemsPerPage,
    initialPage: 1,
  });

  const paginatedData = getPaginatedData(data);
  const gridLayout = columns.map(col => col.width || "1fr").join(" ");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="w-full mx-auto max-h-[80vh]">
        <div className="w-full bg-[#EFEFEF9C] p-5 rounded-[10px] my-5 text-[#666666] sticky top-0 z-10 "
        style={{ 
            display: 'grid', 
            gridTemplateColumns: gridLayout,
          }}
        >
          {columns.map((col) => (
            <div key={col.key} className={`${col.key}`}>
              {col.label}
            </div>
          ))}
        </div>

        {paginatedData.length > 0 ? (
          paginatedData.map((item, index) => (
            <div
              className={`w-full cursor-pointer p-5 border-b border-[#6D6D6D]/9 transition-all duration-300 items-center text-[#838383] hover:translate-x-[5px]`}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: gridLayout,
              }}
              key={item.id || index}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((col) => (
                <div key={col.key} className={`${col.key} text-sm`}>
                  {col.render
                    ? col.render(item, contextData)
                    : (item as any)[col.key] || "—"}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500">{emptyMessage}</div>
        )}
      </div>

      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}

export default DataTable;
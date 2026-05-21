import React from 'react';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (newLimit: number) => void;
  showPageInfo?: boolean;
  showItemsPerPageSelector?: boolean;
  itemsPerPageOptions?: number[];
  isLoading?: boolean; // Added this to prevent the "isLoading not defined" error
}

const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  showPageInfo = true,
  showItemsPerPageSelector = true,
  itemsPerPageOptions = [5, 10, 15, 20],
  isLoading = false,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // If no items or only one page, we can hide pagination or just show the selector
  if (totalItems === 0) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const btnBase = "px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 w-full  pt-4 pb-10">
      
      {/* 1. Page Info & Per Page Selector */}
      <div className="flex items-center gap-4">
        {showPageInfo && (
          <div className="text-sm text-gray-500">
            Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
            <span className="font-semibold">{totalItems}</span>
          </div>
        )}

        {showItemsPerPageSelector && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden md:inline">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1); // Always reset to page 1 when changing limit
              }}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-1 px-2 outline-none"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Page Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className={`${btnBase} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900`}
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {getPages().map((p, i) => (
            typeof p === 'number' ? (
              <button
                key={i}
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`${btnBase} ${
                  currentPage === p 
                    ? 'bg-[#008540] text-white shadow-sm' 
                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={i} className="px-2 text-gray-400">...</span>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0 || isLoading}
          className={`${btnBase} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
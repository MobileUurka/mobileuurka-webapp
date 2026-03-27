import React, { useCallback, useEffect, useState } from 'react';
import { FiSearch, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { authService } from '../services/authServices';

interface SearchProps {
  placeholder?: string;
  onSearch: (val: string) => void;
  onAdd?: () => void; // Made optional
  showAdd?: boolean;  // New prop
  addButtonText?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  refreshing?: boolean;
}

const SearchContainer: React.FC<SearchProps> = ({
  placeholder = "Search...",
  onSearch,
  onAdd,
  showAdd = true, // Default to true so your other pages don't break
  addButtonText = "Add",
  searchValue = "",
  onSearchChange,
  onRefresh,
  showRefresh = false,
  refreshing = false
}) => {
  const [localValue, setLocalValue] = useState(searchValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onSearchChange?.(val);
    onSearch(val);
  };

  const [user, setUser] = useState<any>(null);
  const [initial,setInitial] = useState()
    // We use useCallback so this function doesn't change on every render
    const checkAuth = useCallback(async () => {
      // 1. Initialize encryption keys first      
      const data = await authService.getUser();
      setUser(data)
  
    }, []);
  
    useEffect(() => {
      checkAuth();
    }, [checkAuth]);

    useEffect(() => {
      if (user?.firstName && user?.lastName) {
        const initials =
          user.firstName.charAt(0).toUpperCase() +
          user.lastName.charAt(0).toUpperCase();
        setInitial(initials);
      }
    }, [user]);
  

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-end bg-transparent w-full sm:w-auto">
      <div className="relative flex items-center flex-1 sm:flex-initial">
        <FiSearch className="absolute left-3 text-[#a7a18e] text-lg" />
        <input
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          className="pl-10 pr-4 py-3 border border-[#a7a18e]/30 rounded-lg text-sm w-full sm:w-64 bg-transparent focus:outline-none focus:border-[#008540] transition-all"
        />
      </div>
      
      <div className="flex items-center gap-2 justify-end sm:justify-start">
        {showRefresh && (
          <button 
            onClick={onRefresh}
            className="p-3 bg-gray-50 text-gray-600 border border-[#a7a18e]/30 rounded-lg hover:bg-gray-100 transition-transform active:scale-95 disabled:opacity-50"
            disabled={refreshing}
          >
            <FiRefreshCw className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        
        {/* Only show Add button if showAdd is true */}
        {showAdd && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#008540] text-white rounded-lg text-sm font-medium hover:bg-[#006d35] transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <FiPlus className="text-lg" />
            <span className="hidden sm:inline">{addButtonText}</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>
      <div className='w-10 aspect-square rounded-full bg-[#008540] text-sm text-white flex items-center justify-center'>
        {initial}
      </div>
    </div>
  );
};

export default SearchContainer;
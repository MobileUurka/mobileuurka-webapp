import React, { useState } from "react";
import { FaAngleDown } from "react-icons/fa";

interface OptionObject {
  value: string;
  label: string;
  iconClass?: string;
  color?: string;
}

interface DropdownMenuProps {
  data: (OptionObject | string)[];
  selected: string;
  onChange: (value: string) => void;
  length?: string;
  bg?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ data, selected, onChange, length, bg }) => {
  const [isActive, setIsActive] = useState(false);

  const toggleDropdown = () => setIsActive(!isActive);

  const handleOptionClick = (value: string) => {
    onChange(value);
    setIsActive(false);
  };

  const getSelectedLabel = () => {
    const found = data.find((opt) =>
      typeof opt === "object" ? (opt as OptionObject).value === selected : opt === selected
    );
    return typeof found === "object" ? (found as OptionObject).label : (found as string) || "Select option";
  };

  return (
    <div
      className={`relative top-0 capitalize transition-all duration-300 ${isActive ? "active" : ""}`}
      style={{
        width: length || "180px",
        fontSize: bg ? "0.85em" : "0.8em",
      }}
    >
      {/* Select Button */}
      <div
        className="flex h-[35px] items-center justify-between px-[15px] rounded-[5px] cursor-pointer text-[0.8em]"
        onClick={toggleDropdown}
        style={{
          background: bg || "white",
          fontWeight: bg ? "bold" : "500",
          width: length || "180px",
        }}
      >
        <span className="truncate">{getSelectedLabel()}</span>
        <FaAngleDown 
          className={`transition-transform duration-300 ease-in-out ${isActive ? "rotate-[-180deg]" : ""}`} 
        />
      </div>

      {/* Options List */}
      <ul
        className={`absolute right-0 z-[9999] p-[5px_8px] mt-[10px] rounded-[8px] bg-white capitalize shadow-[0_0_3px_rgba(0,0,0,0.1)] flex-col items-center justify-center
          ${isActive ? "flex" : "hidden"}
        `}
        style={{ width: length || "180px" }}
      >
        {data.map((option, index) => {
          const isObj = typeof option === "object";
          const value = isObj ? (option as OptionObject).value : (option as string);
          const label = isObj ? (option as OptionObject).label : (option as string);

          return (
            <li
              key={index}
              className="flex h-[25px] w-full items-center px-[8px] py-[3px] rounded-[8px] bg-white cursor-pointer hover:bg-[#f2f2f2] transition-colors"
              onClick={() => handleOptionClick(value)}
            >
              {isObj && (option as OptionObject).iconClass && (
                <i 
                  className={`${(option as OptionObject).iconClass} mr-3`} 
                  style={{ color: (option as OptionObject).color }}
                ></i>
              )}
              <span className="text-[#333] text-xs whitespace-nowrap">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DropdownMenu;
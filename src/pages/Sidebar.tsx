import { useEffect, useState } from "react";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { IoSettingsOutline } from "react-icons/io5";
import { FiBell } from "react-icons/fi";
import { RiBubbleChartLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { LuBuilding2 } from "react-icons/lu";
import { authService } from "../services/authServices";
import { BiChevronLeft } from "react-icons/bi";
import { TbNurse } from "react-icons/tb";
import { IoLogOutOutline } from "react-icons/io5";

type SidebarProps = {
    activeItem: string;
    setActiveItem: React.Dispatch<React.SetStateAction<string>>;
    setInternalTab: React.Dispatch<React.SetStateAction<string | null>>;
    sideBarActive: boolean;
    setSideBarActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar = ({ activeItem, setActiveItem, setInternalTab, setSideBarActive, sideBarActive }: SidebarProps) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
    

    const navigate = useNavigate();

    const ClientItems = [
        { name: "Dashboard", icon: <MdOutlineSpaceDashboard /> },
        { name: "Patients", icon: <HiOutlineUserGroup /> },
        { name: "Hospital", icon: <LuBuilding2 /> },
        { name: "Staff", icon: <TbNurse />        },
        { name: "Screening", icon: <RiBubbleChartLine /> },
    ];

    const activityItems = [
        { name: "Settings", icon: <IoSettingsOutline /> },
        { name: "Alerts", icon: <FiBell />, showBadge: true },
        { name: "Logout", icon: <IoLogOutOutline /> }
    ];

    const handleClick = (name: string) => {
        if (name == "Dashboard") {
            setActiveItem(name);
            setInternalTab(null);
            setSidebarOpen(false); // close mobile sidebar
            navigate(`/`);
        }
        else if (name == "Logout") {
            handleLogout();
        }
        else {
            setActiveItem(name);
            setInternalTab(null);
            setSidebarOpen(false); // close mobile sidebar
            navigate(`/${name}`);
        }
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            
        } catch (error) {
            console.error("Logout failed, cleaning up local state anyway:", error);
            // Force clear if the network request fails
        }
        finally{
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    // Update mobile state on resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className={`transition-all duration-300 ease-in-out relative w-full ${sideBarActive ? 'lg:w-[19%]' : 'lg:w-[9%]'} lg:h-screen border-b lg:border-r border-[#efefef] flex flex-row lg:flex-col  bg-white`}>

            {/* Top Bar */}
            <div className="w-full px-7 py-6 flex items-center justify-between lg:justify-start gap-4">
                {/* Logo */}
                <div className="flex items-center gap-4">
                    <div className="w-[50px] aspect-square rounded-lg flex items-center justify-center bg-[#f5f5f5]">
                        <img className="w-[60%]" src="/images/logo.png" alt="Company Logo" />
                    </div>
                    <div className={` ${sideBarActive ? 'hidden lg:block ' : 'hidden lg:hidden'} font-light text-[#984815] text-[14px] tracking-[4px]`}>
                        MOBILEUURKA
                    </div>
                </div>

                <div onClick={() => setSideBarActive((prev) => !prev)}
                    className={` ${!sideBarActive && 'rotate-180'} transition-all ease-in-out cursor-pointer absolute -right-5 hidden lg:inline-flex w-[40px] aspect-square rounded-lg items-center justify-center bg-[#f5f5f5]`}>
                    <BiChevronLeft />
                </div>

                {/* Hamburger for mobile */}
                {isMobile && (
                    <div
                        className={`hamburger hamburger--collapse ${isSidebarOpen ? "is-active" : ""}`}
                        onClick={() => setSidebarOpen(prev => !prev)}
                    >
                        <span className="hamburger-box">
                            <span className="hamburger-inner"></span>
                        </span>
                    </div>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block absolute lg:static top-full left-0 w-full mx-auto lg:w-[90%] bg-white lg:bg-transparent border-t lg:border-none lg:flex-1 px-6 lg:px-4 pb-6">
                <p className="text-sm uppercase text-[#a7a18e] my-4">App</p>
                <ul className="space-y-1">
                    {ClientItems.map((item) => (
                        <li
                            key={item.name}
                            onClick={() => handleClick(item.name)}
                            className={`
                                transition-all duration-300 ease-in-out flex items-center 
                                ${sideBarActive ? 'px-4 gap-3 justify-start' : 'px-0 justify-center'} 
                                py-3 rounded-lg text-sm cursor-pointer 
                                ${activeItem === item.name ? "bg-bgColor" : "hover:bg-bgColor"}
                            `}
                        >
                            <span className="text-[#aca287] text-lg shrink-0">
                                {item.icon}
                            </span>

                            {sideBarActive && (
                                <span className="flex-1 whitespace-nowrap overflow-hidden">
                                    {item.name}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="border-b border-[#efefef] my-6"></div>

                <p className="text-sm uppercase text-[#a7a18e] mb-4">Activities</p>
                <ul className="space-y-1">
                    {activityItems.map(item => (
                        <li
                        key={item.name}
                        onClick={() => handleClick(item.name)}
                        className={`
                            transition-all duration-300 ease-in-out flex items-center 
                            ${sideBarActive ? 'px-4 gap-3 justify-start' : 'px-0 justify-center'} 
                            py-3 rounded-lg text-sm cursor-pointer 
                            ${activeItem === item.name ? "bg-bgColor" : "hover:bg-bgColor"}
                        `}
                    >
                        <span className="text-[#aca287] text-lg shrink-0">
                            {item.icon}
                        </span>

                        {sideBarActive && (
                            <span className="flex-1 whitespace-nowrap overflow-hidden">
                                {item.name}
                            </span>
                        )}
                        {item.showBadge && (
                                <span className={`bg-[#f05b56] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ${sideBarActive ? 'flex' : 'hidden'}`}>
                                    2
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
                
            </div>

            {/* Mobile Sidebar */}
            {isMobile && (
                <>


                    <div
                        className={`fixed top-[12vh] left-0 h-screen w-full bg-white z-50 px-6 pb-6 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                    >
                        <p className="text-sm uppercase text-[#a7a18e] my-4">App</p>
                        <ul className="space-y-1">
                            {ClientItems.map(item => (
                                <li
                                    key={item.name}
                                    onClick={() => handleClick(item.name)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm cursor-pointer transition ${activeItem === item.name ? "bg-[#efefef]" : "hover:bg-bgColor"
                                        }`}
                                >
                                    <span className="text-[#aca287] text-lg">{item.icon}</span>
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="border-b border-[#efefef] my-6"></div>

                        <p className="text-sm uppercase text-[#a7a18e] mb-4">Activities</p>
                        <ul className="space-y-1">
                            {activityItems.map(item => (
                                <li
                                    key={item.name}
                                    onClick={() => handleClick(item.name)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm cursor-pointer transition ${activeItem === item.name ? "bg-bgColor" : "hover:bg-bgColor"
                                        }`}
                                >
                                    <span className="text-[#aca287] text-lg">{item.icon}</span>
                                    <span className="flex-1">{item.name}</span>
                                    {item.showBadge && (
                                        <span className="bg-[#f05b56] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                            2
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>

                       
                    </div>
                </>
            )}
        </div>
    );
};

export default Sidebar;

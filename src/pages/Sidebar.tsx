import { useEffect, useState } from "react";
// import { MdOutlineSpaceDashboard } from "react-icons/md";
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
import { useAppSelector } from "../store/hooks";
import { MdOutlineFeedback } from "react-icons/md";
import { useAuth } from "../contexts/AuthContext";
import { Tooltip } from "react-tooltip";



type SidebarProps = {
    activeItem: string;
    setActiveItem: React.Dispatch<React.SetStateAction<string>>;
    sideBarActive: boolean;
    setSideBarActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar = ({ activeItem, setActiveItem, setSideBarActive, sideBarActive }: SidebarProps) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
    const { user } = useAuth();

    const initial = user?.firstName && user?.lastName
        ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase()
        : user?.name
            ? user.name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).slice(0, 2).join('')
            : user?.email?.charAt(0).toUpperCase() ?? '';



    const navigate = useNavigate();

    const unreadCount = useAppSelector(s =>
        s.notifications.data.filter(n => !n.readAt).length
    );

    const feedbackUnreadCount = useAppSelector(s => s.feedback.totalUnread);

    const ClientItems = [
        // { name: "Dashboard", icon: <MdOutlineSpaceDashboard /> },
        { name: "Patients", icon: <HiOutlineUserGroup /> },
        { name: "Hospital", icon: <LuBuilding2 /> },
        { name: "Staff", icon: <TbNurse /> },
        { name: "Screening", icon: <RiBubbleChartLine /> },
    ];

    const activityItems = [
        { name: "Settings", icon: <IoSettingsOutline /> },
        { name: "Feedback", icon: <MdOutlineFeedback />, showBadge: true },
        { name: "Notifications", icon: <FiBell />, showBadge: true },
        { name: "Logout", icon: <IoLogOutOutline /> }
    ];

    const handleClick = (name: string) => {
        if (name == "Dashboard") {
            setActiveItem(name);
            // setInternalTab(null);
            setSidebarOpen(false); // close mobile sidebar
            navigate(`/`);
        }
        else if (name == "Logout") {
            handleLogout();
        }
        else {
            setActiveItem(name);
            // setInternalTab(null);
            setSidebarOpen(false); // close mobile sidebar
            navigate(`/${name}`);
        }
    };

    const handleLogout = () => {
        // Clear local state immediately and navigate — don't wait for the API
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';

        // Fire the server-side cleanup in the background (invalidates refresh token + session)
        authService.logout().catch((error) => {
            console.warn('Background logout cleanup failed (tokens may expire naturally):', error);
        });
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
                    <div className="flex flex-row items-center gap-3">
                        <div className='w-10 aspect-square rounded-full bg-[#008540] text-sm text-white flex items-center justify-center mr-13 -mt-2'>
                            {initial}
                        </div>
                        <div
                            className={`hamburger hamburger--collapse ${isSidebarOpen ? "is-active" : ""}`}
                            onClick={() => setSidebarOpen(prev => !prev)}
                        >
                            <span className="hamburger-box">
                                <span className="hamburger-inner"></span>
                            </span>
                        </div>
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
                            <span
                                data-tooltip-id={!sideBarActive ? "navbar-tooltip" : undefined}
                                data-tooltip-content={!sideBarActive ? item.name : undefined}
                                className="text-[#aca287] text-lg shrink-0"
                            >
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
                            <span
                                data-tooltip-id={!sideBarActive ? "navbar-tooltip" : undefined}
                                data-tooltip-content={!sideBarActive ? item.name : undefined}
                                className="text-[#aca287] text-lg shrink-0"
                            >
                                {item.icon}
                            </span>

                            {sideBarActive && (
                                <span className="flex-1 whitespace-nowrap overflow-hidden">
                                    {item.name}
                                </span>
                            )}
                            {item.showBadge && (item.name === 'Feedback' ? feedbackUnreadCount : unreadCount) > 0 && (
                                <span className={`bg-[#f05b56] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ${sideBarActive ? 'flex' : 'hidden'}`}>
                                    {(item.name === 'Feedback' ? feedbackUnreadCount : unreadCount) > 99
                                        ? '99+'
                                        : (item.name === 'Feedback' ? feedbackUnreadCount : unreadCount)}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>

            </div>
            <Tooltip id="navbar-tooltip" place="right" style={{ fontSize: ".8em", zIndex: 9999, borderRadius: '8px' }} />


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
                                    {item.showBadge && (item.name === 'Feedback' ? feedbackUnreadCount : unreadCount) > 0 && (
                                        <span className="bg-[#f05b56] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                            {(item.name === 'Feedback' ? feedbackUnreadCount : unreadCount) > 99
                                                ? '99+'
                                                : (item.name === 'Feedback' ? feedbackUnreadCount : unreadCount)}
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

import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../pages/Sidebar";
import { useState, useEffect} from "react";

function Layout() {
  const location = useLocation();

  const getActiveFromPath = (path: string) => {
    if (path === "/") return "Dashboard";
    const firstSegment = path.split("/")[1];
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
  };

  const [activeItem, setActiveItem] = useState(getActiveFromPath(location.pathname));
  const [internalTab, setInternalTab] = useState<string | null>(null);
  const [sideBarActive, setSideBarActive] = useState(true)

  useEffect(() => {
    setActiveItem(getActiveFromPath(location.pathname));
    console.log(internalTab)
  }, [location.pathname]);


    useEffect(() => {
      if(activeItem === 'Patient' ){
        setSideBarActive(false)
      }
    }, [activeItem])

  return (
    /* 1. h-screen: Locks the layout to the full height of the screen.
       2. overflow-hidden: Prevents the whole window from scrolling.
    */
    <div className="w-full h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* The Sidebar container should stay full height. 
          If your Sidebar has its own internal scrolling, it will work here.
      */}
      <Sidebar
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        setInternalTab={setInternalTab}
        sideBarActive={sideBarActive}
        setSideBarActive={setSideBarActive}
      />

      {/* 1. flex-1: Fills the remaining width next to the sidebar.
          2. h-full: Fills the 100vh height.
          3. overflow-y-auto: Only this section will scroll when content is long.
      */}
      <main className="flex-1 h-full overflow-y-auto px-4 md:px-8 custom-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
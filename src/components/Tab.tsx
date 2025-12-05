import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { IoGrid, IoLogOut } from "react-icons/io5";
import { FaUser, FaUsers, FaBriefcase } from "react-icons/fa";
import { MdPayments } from "react-icons/md";
import localforage from "localforage";
import toast from "react-hot-toast";
import logo from "../assets/logo1.png";

// --- Type Definitions ---
interface TabItem {
  path: string;
  name: string;
  icon: React.ReactNode;
}

// --- Component Start ---
const Tab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const PRIMARY_COLOR = "#4eaa3c"; // Define the primary color for reuse

  // 2. Handle Resize for Mobile/Desktop Toggle
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tabs: TabItem[] = [
    // {
    //   path: "/admin/dashboard",
    //   name: "Overview",
    //   icon: <IoGrid size={20} />,
    // },
    {
      path: "/admin/users",
      name: "Users",
      icon: <FaUsers size={20} />,
    },
    {
      path: "/admin/assistant",
      name: "Assistants",
      icon: <FaBriefcase size={20} />,
    },
    {
      path: "/admin/payments",
      name: "Payments",
      icon: <MdPayments size={20} />,
    },
    // { path: "/admin/inbox", name: "Inbox", icon: <FaBriefcase size={20} /> },
    { path: "/admin/profile", name: "Profile", icon: <FaUser size={20} /> },
  ];

  const currentTab: string =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.name ||
    "Dashboard";

  // 3. Handle Logout Functionality
  const handleLogout = async (): Promise<void> => {
    try {
      // Remove the token from storage
      await localforage.removeItem("authToken");
      toast.success("You have been logged out.", { duration: 1500 });
      // Navigate to the login page
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout error. Please try clearing your browser storage.");
    }
  };

  // Display user's first name, defaulting to "User" if loading or null
  const displayFirstName = "Admin";
  // Display initial for the avatar
  const displayInitial = displayFirstName.charAt(0).toUpperCase();

  // --- Helper component for Avatar/Name Display ---
  const UserDisplay: React.FC = () => (
    <div className="flex items-center space-x-3">
      <div
        className="w-10 h-10 flex items-center justify-center font-semibold rounded-full"
        style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}
      >
        {displayInitial}
      </div>
      <div className="text-sm text-gray-700 font-medium">
        {displayFirstName}
      </div>
    </div>
  );

  // --- Desktop Layout ---
  if (!isMobile) {
    return (
      <div className="flex h-screen bg-gray-50 w-full">
        {/* Sidebar */}
        <aside className="w-[20%] bg-[#121212] shadow-lg flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center mt-8 px-5">
              <img src={logo} alt="" className="w-[90px]" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 mt-8">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `w-[85%] flex items-center p-3 transition-colors ${
                      isActive
                        ? "text-white font-medium"
                        : "text-white hover:bg-gray-800"
                    }`
                  }
                  style={({ isActive }) => ({
                    borderTopRightRadius: 20,
                    borderBottomRightRadius: 20,
                    backgroundColor: isActive ? PRIMARY_COLOR : undefined,
                  })}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="p-5">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full text-white py-2 rounded-lg transition"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <IoLogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">{currentTab}</h1>
            <UserDisplay />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // --- Mobile Layout ---
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">{currentTab}</h1>
        <UserDisplay /> {/* Using UserDisplay component here */}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        <main className="p-4">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212] shadow-lg border-t border-gray-700">
        <nav className="flex justify-around items-center">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-4 w-full ${
                  isActive ? "text-white" : "text-gray-400"
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? PRIMARY_COLOR : undefined,
              })}
            >
              <span className="mb-1">{tab.icon}</span>
              <span className="text-xs">{tab.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Tab;

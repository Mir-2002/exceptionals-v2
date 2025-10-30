import React, { useState, useRef } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { FaRegUserCircle } from "react-icons/fa";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    navigate("/settings");
  };

  const handleDashboard = () => {
    setDropdownOpen(false);
    navigate("/dashboard");
  };
  const handleGuide = () => {
    setDropdownOpen(false);
    navigate("/guide");
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-gray-100 shadow">
      <div className="text-xl font-bold">Exceptionals</div>
      <button
        className="ml-auto rounded-md hover:bg-gray-200 focus:bg-gray-300 p-2.5 font-medium"
        onClick={handleLogin}
      >
        Log In
      </button>
      {user && (
        <div className="relative flex items-center gap-x-2" ref={dropdownRef}>
          <button
            className="flex items-center gap-x-2 px-3 py-1 bg-white rounded hover:bg-gray-200 border border-gray-300"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            <FaRegUserCircle className="text-xl" />
            <span className="font-medium">{user.username}</span>
            <svg
              className={`ml-1 w-4 h-4 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute -left-5 top-full mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={handleDashboard}
              >
                Dashboard
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={handleSettings}
              >
                Settings
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={handleGuide}
              >
                Guide
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;

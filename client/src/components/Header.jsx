import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa6";
import Button from "./Button";

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
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
    <header className="w-full h-[10vh] flex flex-row items-center justify-between p-10 font-funnel-sans text-primary bg-tertiary shadow-md">
      <Link to="/" className="text-2xl font-bold">
        Exceptionals
      </Link>
      <nav>
        <ul className="flex flex-row gap-x-3 items-center">
          {!isAuthenticated && (
            <>
              <li>
                <Link
                  to="/login"
                  className="hover:bg-white font-semibold p-3 rounded-xl"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="bg-primary text-white font-semibold p-3 rounded-xl transform transition-transform duration-300 hover:-translate-y-1 inline-block"
                >
                  Register
                </Link>
              </li>
            </>
          )}
          {isAuthenticated && (
            <li className="relative" ref={dropdownRef}>
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-primary/30 font-medium rounded-lg text-sm text-center"
                onClick={() => setDropdownOpen((open) => !open)}
                type="button"
              >
                <FaUser className="text-xl" />
                <span className="font-semibold">{user?.username}</span>
                <FaChevronDown className="w-3 h-3 ms-2" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 z-10 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44">
                  <ul
                    className="py-2 text-sm text-gray-700"
                    aria-labelledby="dropdownHoverButton"
                  >
                    <li>
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/dashboard");
                        }}
                      >
                        Dashboard
                      </button>
                    </li>
                    <li>
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate("/settings");
                        }}
                      >
                        Settings
                      </button>
                    </li>
                    <li>
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg text-red-600"
                        onClick={handleLogout}
                      >
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;

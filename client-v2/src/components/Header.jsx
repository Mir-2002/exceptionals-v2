import React from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-gray-100 shadow">
      <div className="text-xl font-bold">Exceptionals</div>
      {user && (
        <div className="flex items-center gap-x-4">
          <span className="font-medium">Welcome, {user.username}</span>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;

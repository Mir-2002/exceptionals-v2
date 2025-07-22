import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "./Button";

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="w-full h-[10vh] flex flex-row items-center justify-between p-10 bg-blue-200">
      <h1 className="text-2xl font-bold">Exceptionals</h1>
      <nav>
        <ul className="flex flex-row gap-x-6 items-center">
          {!isAuthenticated && (
            <>
              <li>
                <Link to="/login" className="hover:underline font-semibold">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:underline font-semibold">
                  Register
                </Link>
              </li>
            </>
          )}
          {isAuthenticated && (
            <>
              <li className="font-semibold">Welcome, {user?.username}</li>
              <li>
                <Button
                  onClick={handleLogout}
                  variant="danger"
                  className="font-semibold"
                >
                  Logout
                </Button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;

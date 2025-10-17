import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Set token for axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Login function (username only)
  const login = async (username, password) => {
    try {
      const payload = { username, password };
      const { data } = await axios.post(API_URL + "/auth/login", payload, {
        headers: { "Content-Type": "application/json" },
      });
      setToken(data.access_token);
      localStorage.setItem("token", data.access_token);
      await getCurrentUser(data.access_token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      const payload = { username, email, password };
      const { data } = await axios.post(API_URL + "/auth/register", payload, {
        headers: { "Content-Type": "application/json" },
      });
      setToken(data.access_token);
      localStorage.setItem("token", data.access_token);
      await getCurrentUser(data.access_token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Get current user
  const getCurrentUser = async (authToken = token) => {
    try {
      const { data } = await axios.get(API_URL + "/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(data);
      return data;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          await getCurrentUser();
        } catch (error) {
          console.error("Auth check failed:", error);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  login as loginService,
  register as registerService,
  getCurrentUser as getCurrentUserService,
} from "../services/authService";
import axios from "axios";
import { logger } from "../utils/logger";

const AuthContext = createContext();

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

  // Login function
  const login = async (username, password) => {
    try {
      const data = await loginService(username, password);
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
      const data = await registerService(username, email, password);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Get current user
  const getCurrentUser = async (authToken = token) => {
    try {
      const data = await getCurrentUserService(authToken);
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
    // Optionally remove default axios header
    delete axios.defaults.headers.common["Authorization"];
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          await getCurrentUser();
        } catch (error) {
          logger.warn("Auth check failed:", error);
        }
      }
      setLoading(false);
    };
    checkAuth();
    // eslint-disable-next-line
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

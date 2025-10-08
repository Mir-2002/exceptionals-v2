import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Get preferences for a project
export const getPreferences = async (projectId, token) => {
  const res = await axios.get(`${API_URL}/projects/${projectId}/preferences/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// Create preferences for a project
export const createPreferences = async (projectId, preferences, token) => {
  const res = await axios.post(
    `${API_URL}/projects/${projectId}/preferences/`,
    preferences,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

// Update preferences for a project (PATCH)
export const updatePreferences = async (projectId, preferences, token) => {
  const res = await axios.patch(
    `${API_URL}/projects/${projectId}/preferences/`,
    preferences,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

// Delete preferences for a project
export const deletePreferences = async (projectId, token) => {
  const res = await axios.delete(
    `${API_URL}/projects/${projectId}/preferences/`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

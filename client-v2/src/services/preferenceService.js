const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"; // align with fileService

const jsonHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// Get preferences for a project
export const getPreferences = async (projectId, token) => {
  const res = await fetch(`${API_URL}/projects/${projectId}/preferences/`, {
    method: "GET",
    headers: jsonHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error("Failed to get preferences"), {
      status: res.status,
      body: text,
    });
  }
  return res.json();
};

// Create preferences for a project
export const createPreferences = async (projectId, preferences, token) => {
  const res = await fetch(`${API_URL}/projects/${projectId}/preferences/`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(preferences), // expect snake_case fields at root
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error("Failed to create preferences"), {
      status: res.status,
      body: text,
    });
  }
  return res.json();
};

// Update preferences for a project (PATCH full object merge)
export const updatePreferences = async (projectId, preferences, token) => {
  const res = await fetch(`${API_URL}/projects/${projectId}/preferences/`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(preferences), // send full object, not {preferences: ...}
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error("Failed to update preferences"), {
      status: res.status,
      body: text,
    });
  }
  return res.json();
};

// Delete preferences for a project
export const deletePreferences = async (projectId, token) => {
  const res = await fetch(`${API_URL}/projects/${projectId}/preferences/`, {
    method: "DELETE",
    headers: jsonHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error("Failed to delete preferences"), {
      status: res.status,
      body: text,
    });
  }
  return true;
};

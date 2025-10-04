import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Get all projects for a user
export async function getUserProjects(userId, token) {
  const res = await axios.get(`${API_URL}/users/${userId}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Create a new project
export async function createProject({ name, description }, token) {
  const res = await axios.post(
    `${API_URL}/projects`,
    { name, description },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

// Get a single project by ID
export async function getProjectById(projectId, token) {
  const res = await axios.get(`${API_URL}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Update a project
export async function updateProject(projectId, updateData, token) {
  const res = await axios.patch(
    `${API_URL}/projects/${projectId}`,
    updateData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

// Delete a project
export async function deleteProject(projectId, token) {
  const res = await axios.delete(`${API_URL}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

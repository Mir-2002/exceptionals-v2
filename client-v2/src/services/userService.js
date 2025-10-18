import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Create a new user (registration)
export async function createUser({ username, email, password }) {
  const res = await axios.post(`${API_URL}/users`, {
    username,
    email,
    password,
  });
  return res.data;
}

// Get user by ID (requires auth)
export async function getUserById(userId, token) {
  const res = await axios.get(`${API_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Update user (requires auth)
export async function updateUser(userId, updateFields, token) {
  const res = await axios.patch(`${API_URL}/users/${userId}`, updateFields, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Delete user (requires auth)
export async function deleteUser(userId, token) {
  const res = await axios.delete(`${API_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Get all projects for a user (requires auth)
export async function getUserProjects(userId, token) {
  const res = await axios.get(`${API_URL}/users/${userId}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

import axios from "axios";
const API_BASE = "http://localhost:8000/api/auth";

export async function register({ username, email, password }) {
  const res = await axios.post(`${API_BASE}/register`, {
    username,
    email,
    password,
  });
  return res.data;
}

export async function login({ username, password }) {
  const res = await axios.post(`${API_BASE}/login`, { username, password });
  const data = res.data;
  localStorage.setItem("token", data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // Should include ObjectId as id
  } catch {
    return null;
  }
}

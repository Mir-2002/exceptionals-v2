import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is not set");
}

// Register a new user
export async function register(username, email, password) {
  const res = await axios.post(`${API_URL}/auth/register`, {
    username,
    email,
    password,
  });
  return res.data;
}

// Login user
export async function login(username, password) {
  const res = await axios.post(`${API_URL}/auth/login`, {
    username,
    password,
  });
  return res.data;
}

export function startGithubLogin() {
  window.location.href = `${API_URL}/auth/github/login`;
}

// Get current user info (requires token)
export async function getCurrentUser(token) {
  const res = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

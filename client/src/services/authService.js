const API_BASE = "http://localhost:8000/api/auth"; // Adjust if your backend runs elsewhere

export async function register({ username, email, password }) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok)
    throw new Error((await res.json()).detail || "Registration failed");
  return await res.json();
}

export async function login({ username, password }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
  const data = await res.json();
  // Save token to localStorage for future requests
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
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

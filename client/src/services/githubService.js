import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function getRepos(token) {
  const res = await axios.get(`${API_URL}/auth/github/repos`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  // Repos may include `app_installed: boolean`.
  return res.data;
}

export async function getBranches(owner, repo, token) {
  const res = await axios.get(
    `${API_URL}/github/repos/${owner}/${repo}/branches`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return res.data; // [{ name, commit }]
}

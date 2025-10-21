import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error("VITE_API_URL is not set");

// Users
export async function getAllUsers(token) {
  const res = await axios.get(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
export async function updateUser(userId, payload, token) {
  const res = await axios.patch(`${API_URL}/admin/users/${userId}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
export async function deleteUser(userId, token) {
  const res = await axios.delete(`${API_URL}/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Projects
export async function getAllProjects(token) {
  const res = await axios.get(`${API_URL}/admin/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
export async function deleteProject(projectId, token) {
  const res = await axios.delete(`${API_URL}/admin/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function cleanupOrphanProjects(token) {
  const res = await axios.post(
    `${API_URL}/admin/projects/cleanup-orphans`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// Files
export async function getAllFiles(token) {
  const res = await axios.get(`${API_URL}/admin/files`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
export async function deleteFile(fileId, token) {
  const res = await axios.delete(`${API_URL}/admin/files/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
export async function cleanupOrphans(token) {
  const res = await axios.post(
    `${API_URL}/admin/files/cleanup-orphans`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// Documentations
export async function adminListDocumentations(token) {
  const res = await axios.get(`${API_URL}/admin/documentations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function adminDeleteDocumentation(revisionId, token) {
  const res = await axios.delete(
    `${API_URL}/admin/documentations/${revisionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function cleanupOrphanDocs(token) {
  const res = await axios.post(
    `${API_URL}/admin/documentations/cleanup-orphans`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Upload a single Python file
export async function uploadFile(projectId, file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(
    `${API_URL}/projects/${projectId}/files/`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

// Upload multiple Python files
export async function uploadProjectFiles(projectId, files, token) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await axios.post(
    `${API_URL}/projects/${projectId}/files/upload-multiple`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

// Upload a ZIP file
export async function uploadProjectZip(projectId, zipFile, token) {
  const formData = new FormData();
  formData.append("zip_file", zipFile);
  const res = await axios.post(
    `${API_URL}/projects/${projectId}/files/upload-zip`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

// Get file tree
export async function getFileTree(projectId, token) {
  const res = await axios.get(`${API_URL}/projects/${projectId}/files/tree`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Get all files
export async function getAllFiles(projectId, token) {
  const res = await axios.get(`${API_URL}/projects/${projectId}/files/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// Get single file
export async function getFile(projectId, fileId, token) {
  const res = await axios.get(
    `${API_URL}/projects/${projectId}/files/${fileId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

// Delete single file
export async function deleteFile(projectId, fileId, token) {
  const res = await axios.delete(
    `${API_URL}/projects/${projectId}/files/${fileId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

// Delete all files in a project
export async function deleteAllProjectFiles(projectId, token) {
  const res = await axios.delete(`${API_URL}/projects/${projectId}/files/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

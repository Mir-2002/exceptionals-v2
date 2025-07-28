import axios from "axios";

const API_BASE = "http://localhost:8000/api/projects";

/**
 * Upload a single file to a project.
 * @param {string} projectId
 * @param {File} file
 * @param {string} token
 */
export const uploadFile = async (projectId, file, token) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post(`${API_BASE}/${projectId}/files`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Upload a zip file to a project.
 * @param {string} projectId
 * @param {File} zipFile
 * @param {string} token
 */
export const uploadProjectZip = async (projectId, zipFile, token) => {
  const formData = new FormData();
  formData.append("zip_file", zipFile);
  return axios.post(`${API_BASE}/${projectId}/files/upload-zip`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Get all files for a project.
 * @param {string} projectId
 * @param {string} token
 */
export const getProjectFiles = async (projectId, token) => {
  return axios.get(`${API_BASE}/${projectId}/files/all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Get a single file from a project.
 * @param {string} projectId
 * @param {string} fileId
 * @param {string} token
 */
export const getFile = async (projectId, fileId, token) => {
  return axios.get(`${API_BASE}/${projectId}/files/${fileId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Delete a single file from a project.
 * @param {string} projectId
 * @param {string} fileId
 * @param {string} token
 */
export const deleteFile = async (projectId, fileId, token) => {
  return axios.delete(`${API_BASE}/${projectId}/files/${fileId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Delete all files from a project.
 * @param {string} projectId
 * @param {string} token
 */
export const deleteProjectFiles = async (projectId, token) => {
  return axios.delete(`${API_BASE}/${projectId}/files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Get the file tree for a project.
 * @param {string} projectId
 * @param {string} token
 */
export const getProjectFileTree = async (projectId, token) => {
  return axios.get(`${API_BASE}/${projectId}/files/tree`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

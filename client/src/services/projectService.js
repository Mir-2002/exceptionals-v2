import axios from "axios";

const API_URL = "http://localhost:8000/api/projects";

export const createProject = async (projectData, token) => {
  // projectData should include user_id as ObjectId
  return axios.post(API_URL, projectData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getProjectById = async (projectId, token) => {
  return axios.get(`${API_URL}/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateProject = async (projectId, updateData, token) => {
  return axios.patch(`${API_URL}/${projectId}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const deleteProject = async (projectId, token) => {
  return axios.delete(`${API_URL}/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const applyPreferences = async (projectId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/apply-preferences`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

export const processProjectFiles = async (projectId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/files/process`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

export const processSingleFile = async (projectId, fileId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/files/${fileId}/process`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

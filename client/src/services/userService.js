import axios from "axios";

const API_URL = "http://localhost:8000/api/users";

export const createUser = async (userData) => {
  return axios.post(API_URL, userData);
};

export const getUserById = async (userId, token) => {
  return axios.get(`${API_URL}/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateUser = async (userId, updateData, token) => {
  return axios.patch(`${API_URL}/${userId}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const deleteUser = async (userId, token) => {
  return axios.delete(`${API_URL}/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getUserProjects = async (userId, token) => {
  return axios.get(`${API_URL}/${userId}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

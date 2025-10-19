import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error("VITE_API_URL is not set");
}

export async function getDocumentationPlan(projectId, token) {
  try {
    // Cache buster + no-cache headers
    const res = await axios.get(
      `${API_URL}/documentation/projects/${projectId}/plan?t=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Documentation plan error:", error.response?.data || error);
    throw error;
  }
}

export async function generateDocumentation(projectId, token, opts = {}) {
  const { batchSize } = opts;
  try {
    const res = await axios.post(
      `${API_URL}/documentation/projects/${projectId}/generate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: batchSize ? { batch_size: batchSize } : {},
      }
    );
    return res.data;
  } catch (error) {
    console.error(
      "Generate documentation error:",
      error.response?.data || error
    );
    throw error;
  }
}

export async function demoGenerateSingle(code) {
  const res = await axios.post(`${API_URL}/documentation/demo`, { code });
  return res.data;
}

export async function demoGenerateBatch(code, filename) {
  const res = await axios.post(`${API_URL}/documentation/demo/batch`, {
    code,
    filename,
  });
  return res.data;
}

export async function listDocumentationRevisions(projectId, token) {
  const res = await axios.get(
    `${API_URL}/documentation/projects/${projectId}/revisions`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function getDocumentationRevision(projectId, revisionId, token) {
  const res = await axios.get(
    `${API_URL}/documentation/projects/${projectId}/revisions/${revisionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

export async function downloadDocumentationRevision(
  projectId,
  revisionId,
  token
) {
  const res = await axios.get(
    `${API_URL}/documentation/projects/${projectId}/revisions/${revisionId}/download`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    }
  );
  return res;
}

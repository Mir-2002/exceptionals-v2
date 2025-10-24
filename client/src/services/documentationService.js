import axios from "axios";
import { logger } from "../utils/logger";

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
    logger.error("Documentation plan error:", error.response?.data || error);
    throw error;
  }
}

export async function generateDocumentation(projectId, token, opts = {}) {
  const { batchSize, temperature, topP, topK, signal, timeoutMs } = opts;
  try {
    const body = {
      clean_up_tokenization_spaces: true,
      generate_parameters: {
        temperature: typeof temperature === "number" ? temperature : undefined,
        top_p: typeof topP === "number" ? topP : undefined,
        top_k: typeof topK === "number" ? topK : undefined,
      },
    };
    const res = await axios.post(
      `${API_URL}/documentation/projects/${projectId}/generate`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: batchSize ? { batch_size: batchSize } : {},
        // Default to no timeout to allow long-running generations
        timeout: typeof timeoutMs === "number" ? timeoutMs : 0,
        // Allow caller to cancel explicitly (AbortController)
        signal,
      }
    );
    return res.data;
  } catch (error) {
    logger.error(
      "Generate documentation error:",
      error.response?.data || error
    );
    throw error;
  }
}

export async function listDocumentationRevisions(projectId, token) {
  const res = await axios.get(
    `${API_URL}/documentation/projects/${projectId}/revisions`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      params: { t: Date.now() },
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

export async function updateDocumentationRevision(
  projectId,
  revisionId,
  token,
  payload
) {
  const res = await axios.patch(
    `${API_URL}/documentation/projects/${projectId}/revisions/${revisionId}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

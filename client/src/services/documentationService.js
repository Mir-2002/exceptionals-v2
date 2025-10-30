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

// New: single-snippet demo generation (no auth required) with retry on 5xx
export async function generateDemoDocstring(code, opts = {}) {
  const { maxWaitMs = 90000 } = opts;
  const start = Date.now();
  let attempt = 0;
  let delayMs = 1500;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await axios.post(`${API_URL}/documentation/demo/generate`, {
        code,
      });
      return res.data; // { count, results, ... }
    } catch (error) {
      const status = error?.response?.status;
      const modelStatus = error?.response?.headers?.["x-model-status"];

      // 4xx => user/input error, fail immediately
      if (typeof status === "number" && status >= 400 && status < 500) {
        logger.error("Demo generate 4xx:", error.response?.data || error);
        throw error;
      }

      // Otherwise (5xx, network, etc.) retry until maxWaitMs
      const elapsed = Date.now() - start;
      if (elapsed >= maxWaitMs) {
        logger.error(
          `Demo generate timeout after ${attempt} attempts (${elapsed}ms). Last status: ${status} ${
            modelStatus || ""
          }`
        );
        throw error;
      }

      attempt += 1;
      logger.warn(
        `Demo generate transient error (attempt ${attempt}) status=${status} model=${
          modelStatus || "unknown"
        }. Retrying in ${delayMs}ms...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(Math.floor(delayMs * 1.6), 7000);
      continue;
    }
  }
}

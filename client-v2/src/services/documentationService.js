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

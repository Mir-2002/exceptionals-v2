import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

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

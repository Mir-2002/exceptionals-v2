import axios from "axios";
const API_BASE = "http://localhost:8000/api/documentation";

// Send code to the demo docstring endpoint
export async function generateDocstring({ code, name, type }) {
  try {
    const res = await axios.post(`${API_BASE}/demo`, { code, name, type });
    return res.data;
  } catch (err) {
    throw new Error(
      err?.response?.data?.detail || "Docstring generation failed"
    );
  }
}

const API_BASE = "http://localhost:8000/api/documentation";

// Send code to the demo docstring endpoint
export async function generateDocstring({ code, name, type }) {
  const res = await fetch(`${API_BASE}/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, name, type }),
  });
  if (!res.ok)
    throw new Error((await res.json()).detail || "Docstring generation failed");
  return await res.json();
}

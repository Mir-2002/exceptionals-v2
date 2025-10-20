import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import {
  adminListDocumentations,
  adminDeleteDocumentation,
} from "../../services/adminService";

const Row = ({ doc, onDelete, onDownload, onOpen }) => (
  <div className="flex items-center justify-between p-3 border rounded bg-white">
    <div className="min-w-0">
      <div className="font-semibold truncate">{doc.project_id}</div>
      <div className="text-xs text-gray-500 truncate">
        {doc.id} · {doc.format}
      </div>
    </div>
    <div className="flex gap-2">
      <button
        className="px-2 py-1 text-sm border rounded"
        onClick={() => onOpen(doc)}
      >
        Open
      </button>
      <button
        className="px-2 py-1 text-sm border rounded"
        onClick={() => onDownload(doc)}
      >
        Download
      </button>
      <button
        className="px-2 py-1 text-sm border rounded text-red-600"
        onClick={() => onDelete(doc)}
      >
        Delete
      </button>
    </div>
  </div>
);

const AdminDocs = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await adminListDocumentations(token);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const onDelete = async (doc) => {
    if (!window.confirm("Delete this documentation revision?")) return;
    try {
      await adminDeleteDocumentation(doc.id, token);
      setRows((prev) => prev.filter((r) => r.id !== doc.id));
    } catch {}
  };

  const onOpen = (doc) => {
    navigate(`/admin/documentations/${doc.id}`);
  };

  const onDownload = async (doc) => {
    const base = import.meta.env.VITE_API_URL;
    const url = `${base}/documentation/projects/${doc.project_id}/revisions/${doc.id}/download`;
    // open in new tab; if auth required, the user will need to download from the detail page
    window.open(url, "_blank");
  };

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Documentations</h2>
        <button
          className="px-3 py-2 text-sm border rounded bg-white hover:bg-gray-50"
          onClick={() => navigate("/admin")}
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-600">No documentation revisions found.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <Row
              key={d.id}
              doc={d}
              onDelete={onDelete}
              onDownload={onDownload}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminDocs;

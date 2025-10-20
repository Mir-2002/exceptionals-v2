import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import {
  adminListDocumentations,
  adminDeleteDocumentation,
} from "../../services/adminService";
import { Button, Card, LoadingSpinner } from "../../components/ui";

const Row = ({ doc, onDelete, onDownload, onOpen }) => (
  <Card className="p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">{doc.project_id}</div>
        <div className="text-xs text-gray-500 truncate">
          {doc.id} · {doc.format}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="primary" onClick={() => onOpen(doc)}>
          Open
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDownload(doc)}>
          Download
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(doc)}>
          Delete
        </Button>
      </div>
    </div>
  </Card>
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
    window.open(url, "_blank");
  };

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Documentations</h2>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          ← Back
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading..." />
      ) : rows.length === 0 ? (
        <Card>
          <div className="text-gray-600">No documentation revisions found.</div>
        </Card>
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

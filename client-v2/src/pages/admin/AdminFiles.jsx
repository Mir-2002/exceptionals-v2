import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authContext";
import { showError, showSuccess } from "../../utils/toast";
import {
  getAllFiles,
  deleteFile,
  cleanupOrphans,
} from "../../services/adminService";
import { useNavigate } from "react-router-dom";
import { Button, Card, LoadingSpinner } from "../../components/ui";

const AdminFiles = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllFiles(token);
      setFiles(data);
    } catch (e) {
      showError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await deleteFile(id, token);
      showSuccess("File deleted");
      load();
    } catch (e) {
      showError("Delete failed");
    }
  };

  const onCleanup = async () => {
    try {
      const res = await cleanupOrphans(token);
      showSuccess(res?.detail || "Cleanup done");
      load();
    } catch (e) {
      showError("Cleanup failed");
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Manage Files</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            ← Back
          </Button>
          <Button variant="warning" onClick={onCleanup}>
            Cleanup Orphaned Files
          </Button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Project</th>
                <th className="p-2 text-left">Filename</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">{f.id}</td>
                  <td className="p-2">
                    <div className="text-sm text-gray-800">
                      {f.project_name || "(unknown)"}
                    </div>
                    <div className="text-xs text-gray-500">{f.project_id}</div>
                  </td>
                  <td className="p-2">{f.filename}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete(f.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};

export default AdminFiles;

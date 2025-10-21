import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authContext";
import { showError, showSuccess } from "../../utils/toast";
import {
  getAllProjects,
  deleteProject,
  cleanupOrphanProjects,
} from "../../services/adminService";
import { useNavigate } from "react-router-dom";
import { Button, Card, LoadingSpinner } from "../../components/ui";

const AdminProjects = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllProjects(token);
      setProjects(data);
    } catch (e) {
      showError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this project (and its files)?")) return;
    try {
      await deleteProject(id, token);
      showSuccess("Project deleted");
      load();
    } catch (e) {
      showError("Delete failed");
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
        <h2 className="text-2xl font-bold">Manage Projects</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            ← Back
          </Button>
          <Button
            variant="warning"
            onClick={async () => {
              try {
                const res = await cleanupOrphanProjects(token);
                showSuccess(res?.detail || "Cleanup done");
                load();
              } catch {
                showError("Cleanup failed");
              }
            }}
          >
            Cleanup Orphaned Projects
          </Button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Owner</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.user_id}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete(p.id)}
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

export default AdminProjects;

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authContext";
import { showError, showSuccess } from "../../utils/toast";
import { getAllProjects, deleteProject } from "../../services/adminService";

const AdminProjects = () => {
  const { token } = useAuth();
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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Projects</h2>
      <table className="w-full border">
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
                <button
                  className="px-2 py-1 bg-red-600 text-white rounded"
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
};

export default AdminProjects;

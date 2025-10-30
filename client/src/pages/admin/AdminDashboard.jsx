import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui";

const AdminDashboard = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen w-full flex items-start justify-center p-8 bg-gray-50">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          onClick={() => navigate("/admin/users")}
          className="cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Users</h3>
          <p className="text-gray-600">View, edit, and delete users.</p>
        </Card>
        <Card
          onClick={() => navigate("/admin/files")}
          className="cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Files</h3>
          <p className="text-gray-600">
            Browse and delete files; cleanup orphaned files.
          </p>
        </Card>
        <Card
          onClick={() => navigate("/admin/projects")}
          className="cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Projects</h3>
          <p className="text-gray-600">
            View, delete, and cleanup orphaned projects.
          </p>
        </Card>
        <Card
          onClick={() => navigate("/admin/documentations")}
          className="cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold mb-2">Manage Documentations</h3>
          <p className="text-gray-600">
            View and manage documentation revisions; cleanup orphaned docs.
          </p>
        </Card>
        <Card
          onClick={() => navigate("/admin/bulk-delete")}
          className="cursor-pointer hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold mb-2">Danger Zone</h3>
          <p className="text-gray-600">
            Bulk delete users, projects, files, docs.
          </p>
        </Card>
      </div>
    </main>
  );
};

export default AdminDashboard;

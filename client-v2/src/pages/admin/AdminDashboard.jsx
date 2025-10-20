import React from "react";
import { useNavigate } from "react-router-dom";

const Card = ({ title, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-6 border rounded-lg shadow hover:shadow-md transition bg-white"
  >
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </button>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen w-full flex items-start justify-center p-8 bg-gray-50">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Manage Users"
          description="View, edit, and delete users."
          onClick={() => navigate("/admin/users")}
        />
        <Card
          title="Manage Files"
          description="Browse and delete files; cleanup orphaned files."
          onClick={() => navigate("/admin/files")}
        />
        <Card
          title="Manage Projects"
          description="View and delete projects."
          onClick={() => navigate("/admin/projects")}
        />
        <Card
          title="Manage Documentations"
          description="View and manage documentation revisions."
          onClick={() => navigate("/admin/documentations")}
        />
      </div>
    </main>
  );
};

export default AdminDashboard;

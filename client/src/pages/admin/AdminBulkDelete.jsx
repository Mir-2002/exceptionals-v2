// filepath: client/src/pages/admin/AdminBulkDelete.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { Button, Card } from "../../components/ui";
import {
  adminDeleteAllUsers,
  adminDeleteAllProjects,
  adminDeleteAllFiles,
  adminDeleteAllDocs,
} from "../../services/adminService";
import { showError, showSuccess } from "../../utils/toast";

const Section = ({ title, description, onConfirm, loading }) => {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Button
        variant="danger"
        disabled={loading}
        onClick={() => {
          const ok = window.prompt(
            `Type DELETE to confirm ${title.toLowerCase()}`
          );
          if (ok === "DELETE") onConfirm();
        }}
      >
        {loading ? "Working..." : "Delete All"}
      </Button>
    </Card>
  );
};

const AdminBulkDelete = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [busy, setBusy] = useState("");

  const wrap = (key, fn) => async () => {
    try {
      setBusy(key);
      const res = await fn();
      showSuccess(res?.detail || "Done");
    } catch (e) {
      showError("Action failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="min-h-screen w-full flex items-start justify-center p-8 bg-gray-50">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Danger Zone · Bulk Delete</h2>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            ← Back
          </Button>
        </div>
        <Section
          title="Delete All Users"
          description="Delete all users except the current admin. This cannot be undone."
          loading={busy === "users"}
          onConfirm={wrap("users", () => adminDeleteAllUsers(token))}
        />
        <Section
          title="Delete All Projects"
          description="Delete all projects including their files and documentations. Irreversible."
          loading={busy === "projects"}
          onConfirm={wrap("projects", () => adminDeleteAllProjects(token))}
        />
        <Section
          title="Delete All Files"
          description="Delete every file record in the system."
          loading={busy === "files"}
          onConfirm={wrap("files", () => adminDeleteAllFiles(token))}
        />
        <Section
          title="Delete All Documentations"
          description="Delete every documentation revision."
          loading={busy === "docs"}
          onConfirm={wrap("docs", () => adminDeleteAllDocs(token))}
        />
      </div>
    </main>
  );
};

export default AdminBulkDelete;

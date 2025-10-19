import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { showError, showSuccess } from "../utils/toast";
import { getAllUsers, updateUser, deleteUser } from "../services/adminService";

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers(token);
      setUsers(data);
    } catch (e) {
      showError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const startEdit = (u) => {
    setEditing(u.id);
    setForm({ username: u.username || "", email: u.email || "", password: "" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ username: "", email: "", password: "" });
  };

  const saveEdit = async (id) => {
    try {
      const payload = { username: form.username, email: form.email };
      if (form.password) payload.password = form.password;
      await updateUser(id, payload, token);
      showSuccess("User updated");
      setEditing(null);
      setForm({ username: "", email: "", password: "" });
      load();
    } catch (e) {
      showError("Update failed");
    }
  };

  const onToggleAdmin = async (u) => {
    try {
      await updateUser(u.id, { is_admin: !u.is_admin }, token);
      showSuccess("User updated");
      load();
    } catch (e) {
      showError("Update failed");
    }
  };

  const onDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    try {
      await deleteUser(u.id, token);
      showSuccess("User deleted");
      load();
    } catch (e) {
      showError("Delete failed");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Username</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Admin</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t align-top">
              <td className="p-2 text-xs text-gray-600">{u.id}</td>
              <td className="p-2">
                {editing === u.id ? (
                  <input
                    className="border rounded px-2 py-1 w-48"
                    value={form.username}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, username: e.target.value }))
                    }
                  />
                ) : (
                  u.username
                )}
              </td>
              <td className="p-2">
                {editing === u.id ? (
                  <input
                    className="border rounded px-2 py-1 w-64"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                ) : (
                  u.email
                )}
              </td>
              <td className="p-2">{u.is_admin ? "Yes" : "No"}</td>
              <td className="p-2 space-x-2">
                {editing === u.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      className="border rounded px-2 py-1"
                      type="password"
                      placeholder="New password (optional)"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                    <button
                      className="px-2 py-1 bg-green-600 text-white rounded"
                      onClick={() => saveEdit(u.id)}
                    >
                      Save
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-500 text-white rounded"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                      onClick={() => startEdit(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 bg-indigo-600 text-white rounded"
                      onClick={() => onToggleAdmin(u)}
                    >
                      Toggle Admin
                    </button>
                    <button
                      className="px-2 py-1 bg-red-600 text-white rounded"
                      onClick={() => onDelete(u)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
};

export default AdminUsers;

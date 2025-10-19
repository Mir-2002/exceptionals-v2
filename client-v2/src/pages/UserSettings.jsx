import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { getUserById, updateUser, deleteUser } from "../services/userService";
import { showSuccess, showError } from "../utils/toast";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import {
  FiUser,
  FiMail,
  FiTrash2,
  FiArrowLeft,
  FiSettings,
} from "react-icons/fi";

const UserSettings = () => {
  const { user, token, logout } = useAuth();
  const [form, setForm] = useState({ username: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserById(user.id, token);
        setForm({ username: data.username, email: data.email });
      } catch (err) {
        showError("Failed to load user info.");
      } finally {
        setLoading(false);
      }
    };
    if (user && token) fetchUser();
  }, [user, token]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(user.id, form, token);
      showSuccess("Profile updated!");
      setEditingField(null);
    } catch (err) {
      showError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteUser(user.id, token);
      showSuccess("Account deleted.");
      logout();
      navigate("/register");
    } catch (err) {
      showError("Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <div className="flex items-center gap-2">
            <FiSettings className="text-blue-600" />
            <Card.Title>User Settings</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          {/* Username Section - OUTSIDE form */}
          <div className="space-y-6">
            <div>
              <label className="inline-flex items-center gap-2 mb-1 font-medium">
                <FiUser /> Username
              </label>
              <div className="flex items-center gap-2">
                {editingField === "username" ? (
                  <form
                    onSubmit={handleSave}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                      disabled={saving}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingField(null)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="font-mono text-gray-800">
                      {form.username}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setEditingField("username")}
                    >
                      Change Username
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Email Section - OUTSIDE form */}
            <div>
              <label className="inline-flex items-center gap-2 mb-1 font-medium">
                <FiMail /> Email
              </label>
              <div className="flex items-center gap-2">
                {editingField === "email" ? (
                  <form
                    onSubmit={handleSave}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded"
                      required
                      disabled={saving}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingField(null)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="font-mono text-gray-800">
                      {form.email}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setEditingField("email")}
                    >
                      Change Email
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="my-6" />
          <Button
            variant="danger"
            className="w-full mb-4 inline-flex items-center justify-center gap-2"
            onClick={handleDelete}
            disabled={deleting}
          >
            <FiTrash2 /> {deleting ? "Deleting..." : "Delete Account"}
          </Button>
          <Button
            variant="secondary"
            className="w-full inline-flex items-center justify-center gap-2"
            onClick={() => navigate("/dashboard")}
            disabled={deleting || saving}
          >
            <FiArrowLeft /> Back to Dashboard
          </Button>
        </Card.Content>
      </Card>
    </main>
  );
};

export default UserSettings;

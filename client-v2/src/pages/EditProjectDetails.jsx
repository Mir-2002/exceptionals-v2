// filepath: client-v2/src/pages/EditProjectDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Button, Card } from "../components/ui";
import { getProjectById, updateProject } from "../services/projectService";

export default function EditProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProjectById(projectId, token);
        setName(data?.name || "");
        setDescription(data?.description || "");
        setTags((data?.tags || []).join(", "));
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    if (projectId && token) load();
  }, [projectId, token]);

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name?.trim(),
        description: description?.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      await updateProject(projectId, payload, token);
      navigate(`/projects/${projectId}`);
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <Card.Header>
          <Card.Title>Edit Project Details</Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
          )}
        </Card.Content>
        <Card.Footer className="flex justify-between">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

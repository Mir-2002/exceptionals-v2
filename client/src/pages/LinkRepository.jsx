import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { getRepos, getBranches } from "../services/githubService";
import axios from "axios";
import { Button, Card, LoadingSpinner } from "../components/ui";
import { showError, showSuccess } from "../utils/toast";
import { FiFolderPlus, FiTag } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL;

const TAG_OPTIONS = ["Library", "Framework", "API"];

export default function LinkRepository() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const githubConnected = user?.auth_provider === "github";

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getRepos(token);
        setRepos(data || []);
      } catch (e) {
        showError("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    };
    if (githubConnected) fetch();
    else setLoading(false);
  }, [githubConnected, token]);

  useEffect(() => {
    const loadBranches = async () => {
      if (!selectedRepo) {
        setBranches([]);
        setBranch("");
        return;
      }
      try {
        const [owner, repo] = selectedRepo.split("/");
        const data = await getBranches(owner, repo, token);
        setBranches(data || []);
        setBranch("");
      } catch (e) {
        setBranches([]);
        setBranch("");
        showError("Failed to load branches");
      }
    };
    loadBranches();
  }, [selectedRepo, token]);

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const repoOptions = useMemo(
    () => repos.map((r) => ({ value: r.full_name, label: r.full_name })),
    [repos]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRepo) return showError("Please select a repository");
    if (!branch) return showError("Please select a branch");
    if (!name.trim() || !description.trim())
      return showError("Please enter project name and description");
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/github/import`,
        {
          name,
          description,
          repo_full_name: selectedRepo,
          ref: branch,
          tags: selectedTags,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      showSuccess("Repository linked and project created!");
      navigate(`/projects/${res.data.id}`);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to link repository";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!githubConnected) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <Card.Header>
            <Card.Title>Link a Repository</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-gray-600">
              You must sign in with GitHub to link a repository.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </Card.Content>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 flex items-start justify-center px-4">
      <Card className="w-full max-w-2xl">
        <Card.Header>
          <div className="flex items-center gap-2">
            <FiFolderPlus className="text-blue-600 text-xl" />
            <Card.Title>Link a GitHub Repository</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Repository
                </label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  required
                >
                  <option value="">Select a repository</option>
                  {repoOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                >
                  <option value="">Select a branch</option>
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 font-medium inline-flex items-center gap-2">
                  <FiTag /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`px-3 py-1 rounded-full border text-sm transition ${
                        selectedTags.includes(tag)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      }`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add custom tag"
                    className="px-3 py-2 border rounded w-full"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      const tag = customTag.trim();
                      if (tag && !selectedTags.includes(tag)) {
                        setSelectedTags((prev) => [...prev, tag]);
                        setCustomTag("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Linking…" : "Link Repository"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card.Content>
      </Card>
    </main>
  );
}

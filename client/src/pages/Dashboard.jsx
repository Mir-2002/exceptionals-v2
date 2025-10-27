import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { getUserProjects } from "../services/projectService";
import { Button, Card, LoadingSpinner } from "../components/ui";
import StatsCard from "../components/ui/StatsCard";

const Dashboard = () => {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("updated");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const data = await getUserProjects(user.id, token);
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user, token]);

  const stats = useMemo(() => {
    const total = projects.length;
    const byStatus = projects.reduce(
      (acc, p) => {
        const s = (p.status || "empty").toLowerCase();
        if (s.includes("complete")) acc.completed += 1;
        else if (s.includes("progress")) acc.in_progress += 1;
        else acc.empty += 1;
        return acc;
      },
      { completed: 0, in_progress: 0, empty: 0 }
    );
    return { total, ...byStatus };
  }, [projects]);

  const sorted = useMemo(() => {
    const copy = [...projects];
    if (sort === "alpha") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "created") {
      copy.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    } else if (sort === "updated") {
      copy.sort(
        (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      );
    } else if (sort === "status") {
      const rank = (s) => {
        s = (s || "empty").toLowerCase();
        if (s.includes("complete")) return 0; // first
        if (s.includes("progress")) return 1;
        return 2; // empty last
      };
      copy.sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        return r !== 0 ? r : a.name.localeCompare(b.name);
      });
    }
    return copy;
  }, [projects, sort]);

  const handleCardClick = (projectId) => navigate(`/projects/${projectId}`);

  return (
    <main className="min-h-screen w-full bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate("/link-repo")}
              disabled={user?.auth_provider !== "github"}
              title={
                user?.auth_provider !== "github"
                  ? "Sign in with GitHub to link a repository"
                  : "Link a repository"
              }
            >
              Link Repository
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate("/projects/create")}
            >
              Create Project
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatsCard title="Total Projects" value={stats.total} color="blue" />
          <StatsCard title="Completed" value={stats.completed} color="green" />
          <StatsCard
            title="In Progress"
            value={stats.in_progress}
            color="yellow"
          />
          <StatsCard title="Empty" value={stats.empty} color="orange" />
        </div>

        {/* Sort bar */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">Sort projects by</div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={sort === "updated" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSort("updated")}
              >
                Recently Updated
              </Button>
              <Button
                variant={sort === "created" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSort("created")}
              >
                Date Created
              </Button>
              <Button
                variant={sort === "alpha" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSort("alpha")}
              >
                A-Z
              </Button>
              <Button
                variant={sort === "status" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSort("status")}
              >
                Status
              </Button>
            </div>
          </div>
        </Card>

        {/* Projects */}
        <Card>
          <Card.Header>
            <Card.Title>Your Projects</Card.Title>
          </Card.Header>
          <Card.Content>
            {loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No projects found
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sorted.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => handleCardClick(p.id)}
                      className="w-full text-left p-4 rounded border bg-white hover:bg-blue-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate pr-2">
                          {p.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 font-semibold rounded ${
                            (p.status || "").toLowerCase().includes("complete")
                              ? "bg-green-100 text-green-800"
                              : (p.status || "")
                                  .toLowerCase()
                                  .includes("progress")
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-500 text-white"
                          }`}
                        >
                          {(p.status || "EMPTY").toUpperCase()}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        {p.updated_at && (
                          <span>
                            Updated: {new Date(p.updated_at).toLocaleString()}
                          </span>
                        )}
                        {p.created_at && (
                          <span>
                            Created:{" "}
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>
      </div>
    </main>
  );
};

export default Dashboard;

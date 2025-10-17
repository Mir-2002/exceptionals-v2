import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import { getUserProjects } from "../services/projectService";
import { Button, Card, LoadingSpinner } from "../components/ui";

const Dashboard = () => {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const data = await getUserProjects(user.id, token);
        setProjects(data);
      } catch (err) {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user, token]);

  const handleCardClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <Button variant="primary" onClick={() => navigate("/projects/create")}>
        Create New Project
      </Button>
      <Card className="mt-6 w-full max-w-xl">
        <Card.Header>
          <Card.Title>Your Projects</Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <LoadingSpinner center />
          ) : projects.length === 0 ? (
            <div className="text-gray-500 text-center">No projects found</div>
          ) : (
            <div>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="mb-4 p-4 border rounded shadow cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => handleCardClick(project.id)}
                >
                  {project.name}
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default Dashboard;

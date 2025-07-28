import React, { useEffect, useState } from "react";
import Container from "../components/Container";
import Sidebar from "../components/dashboard/Sidebar";
import Actions from "../components/dashboard/Actions";
import ProjectsDash from "../components/dashboard/ProjectsDash";
import DocumentationsDash from "../components/dashboard/DocumentationsDash";
import { getUserProjects } from "../services/userService";
import { getToken, getCurrentUser } from "../services/authService";

function MainDash() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const u = await getCurrentUser();
        setUser(u);
        if (u) {
          const token = getToken();
          const res = await getUserProjects(u.id, token);
          setProjects(res.data);
        } else {
          setError("User not authenticated.");
        }
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Failed to fetch projects. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  return (
    <main className="flex flex-col items-center w-full h-full">
      <Actions />
      {loading ? (
        <div className="mt-10 text-lg text-gray-500">Loading projects...</div>
      ) : error ? (
        <div className="mt-10 text-lg text-red-500">{error}</div>
      ) : (
        <div className="flex flex-row w-full h-full">
          <ProjectsDash projects={projects} />
          <DocumentationsDash />
        </div>
      )}
    </main>
  );
}

const Dashboard = () => {
  return (
    <Container className="flex-row w-full items-start h-screen">
      <Sidebar />
      <MainDash />
    </Container>
  );
};

export default Dashboard;

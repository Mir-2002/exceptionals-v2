import React, { useEffect, useState } from "react";
import Container from "../components/Container";
import Sidebar from "../components/dashboard/Sidebar";
import Heading from "../components/Heading";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import { getProjectFiles } from "../services/fileService";
import { getProjectById } from "../services/projectService";
import {
  FaCode,
  FaCog,
  FaFileAlt,
  FaChevronRight,
  FaCalendar,
} from "react-icons/fa";

const ManageProject = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [projectStats, setProjectStats] = useState({
    totalFiles: 0,
    totalFunctions: 0,
    totalClasses: 0,
    totalMethods: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // Fetch project info
        const projectRes = await getProjectById(projectId, token);
        const projectData = projectRes.data;
        setProject(projectData);

        // Fetch files info for statistics
        const filesRes = await getProjectFiles(projectId, token);
        const files = filesRes.data || [];

        let functions = 0;
        let classes = 0;
        let methods = 0;

        files.forEach((file) => {
          functions += file.functions ? file.functions.length : 0;
          classes += file.classes ? file.classes.length : 0;
          if (file.classes && file.classes.length > 0) {
            file.classes.forEach((cls) => {
              methods += cls.methods ? cls.methods.length : 0;
            });
          }
        });

        setProjectStats({
          totalFiles: files.length,
          totalFunctions: functions,
          totalClasses: classes,
          totalMethods: methods,
        });
      } catch (error) {
        console.error("Error fetching project data:", error);
        setError("Failed to load project data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const getStatusColor = (status) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "empty":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <Container className="flex-row w-full h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-500">Loading project...</div>
        </div>
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container className="flex-row w-full h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-red-500 mb-4">
              {error || "Project not found"}
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex-row w-full h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="p-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="hover:text-primary transition-colors"
              >
                Dashboard
              </button>
              <FaChevronRight className="mx-2 text-xs" />
              <span className="text-gray-800 font-medium">
                Project Management
              </span>
            </div>

            {/* Project Title and Status */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <Heading className="text-3xl font-bold text-gray-900 mb-1">
                  {project.name}
                </Heading>
                <p className="text-gray-600 text-lg">{project.description}</p>
              </div>

              {/* Status Badge */}
              <div
                className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  project.status
                )}`}
              >
                {formatStatus(project.status)}
              </div>
            </div>

            {/* Project Meta Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FaCalendar className="text-primary" />
                <span>
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FaCalendar className="text-primary" />
                <span>
                  Updated: {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Project Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-700">
                      {projectStats.totalFiles}
                    </p>
                    <p className="text-sm text-blue-600 font-medium">Files</p>
                  </div>
                  <FaFileAlt className="text-blue-400 text-xl" />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-purple-700">
                      {projectStats.totalFunctions}
                    </p>
                    <p className="text-sm text-purple-600 font-medium">
                      Functions
                    </p>
                  </div>
                  <FaCode className="text-purple-400 text-xl" />
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {projectStats.totalClasses}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Classes
                    </p>
                  </div>
                  <FaCode className="text-green-400 text-xl" />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-orange-700">
                      {projectStats.totalMethods}
                    </p>
                    <p className="text-sm text-orange-600 font-medium">
                      Methods
                    </p>
                  </div>
                  <FaCode className="text-orange-400 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="border-t border-gray-200">
            <div className="flex">
              <NavLink
                end
                to={`/dashboard/projects/${projectId}/manage`}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-4 px-6 border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`
                }
              >
                <FaFileAlt className="text-xl mb-1" />
                <span className="font-medium">Files</span>
                <span className="text-xs text-gray-500 mt-1">
                  Manage project files
                </span>
              </NavLink>

              <NavLink
                to={`/dashboard/projects/${projectId}/manage/preferences`}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-4 px-6 border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`
                }
              >
                <FaCog className="text-xl mb-1" />
                <span className="font-medium">Preferences</span>
                <span className="text-xs text-gray-500 mt-1">
                  Configure settings
                </span>
              </NavLink>

              <NavLink
                to={`/dashboard/projects/${projectId}/manage/documentation`}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-4 px-6 border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`
                }
              >
                <FaFileAlt className="text-xl mb-1" />
                <span className="font-medium">Documentation</span>
                <span className="text-xs text-gray-500 mt-1">
                  Generate & view docs
                </span>
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 h-full">
            <Outlet context={{ project, projectStats }} />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ManageProject;

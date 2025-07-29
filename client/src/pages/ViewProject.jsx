import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { getProjectById } from "../services/projectService";
import { getProjectFiles, getProjectFileTree } from "../services/fileService";
import { getToken } from "../services/authService";
import { FaFolder, FaFolderOpen, FaFile, FaPython } from "react-icons/fa";
import { MdExpandMore, MdChevronRight } from "react-icons/md";

// Helper function to format status
function formatStatus(status) {
  if (!status) return "N/A";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Status color mapping
const statusColorMap = {
  complete: "text-green-500",
  in_progress: "text-yellow-500",
  empty: "text-red-500",
};

// Tree component for directory structure
function TreeNode({ node, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const handleToggle = () => {
    if (node.children && node.children.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const getFileIcon = (name, isDirectory) => {
    if (isDirectory) {
      return isExpanded ? (
        <FaFolderOpen className="text-blue-500" />
      ) : (
        <FaFolder className="text-blue-500" />
      );
    }

    if (name.endsWith(".py")) {
      return <FaPython className="text-green-600" />;
    }

    return <FaFile className="text-gray-500" />;
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleToggle}
      >
        {node.children && node.children.length > 0 ? (
          isExpanded ? (
            <MdExpandMore className="text-gray-400 mr-1" />
          ) : (
            <MdChevronRight className="text-gray-400 mr-1" />
          )
        ) : (
          <span className="w-4 mr-1" />
        )}
        {getFileIcon(node.name, node.children && node.children.length > 0)}
        <span className="ml-2 text-sm">{node.name}</span>
      </div>
      {isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// File card component for individual files
function FileCard({ file }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-center mb-2">
        <FaPython className="text-green-600 mr-2" />
        <h3 className="text-lg font-medium">{file.filename}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Functions: </span>
          <span className="text-blue-600">{file.functions?.length || 0}</span>
        </div>
        <div>
          <span className="font-medium">Classes: </span>
          <span className="text-purple-600">{file.classes?.length || 0}</span>
        </div>
      </div>
      {file.functions && file.functions.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-sm mb-2">Functions:</h4>
          <div className="flex flex-wrap gap-1">
            {file.functions.map((func, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
              >
                {func.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {file.classes && file.classes.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-sm mb-2">Classes:</h4>
          <div className="flex flex-wrap gap-1">
            {file.classes.map((cls, index) => (
              <span
                key={index}
                className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
              >
                {cls.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewProject() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const token = getToken();

  useEffect(() => {
    async function fetchProjectData() {
      if (!projectId || !token) {
        setError("Project ID or authentication token missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch project details
        const projectRes = await getProjectById(projectId, token);
        setProject(projectRes.data);

        // Fetch project files
        const filesRes = await getProjectFiles(projectId, token);
        setFiles(filesRes.data);

        // Try to fetch project tree (for zip uploads)
        try {
          const treeRes = await getProjectFileTree(projectId, token);
          setTree(treeRes.data);
        } catch (treeError) {
          // Tree endpoint might not exist or project might not have tree structure
          console.log("No tree structure available:", treeError);
          setTree(null);
        }
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Failed to fetch project data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [projectId, token]);

  if (loading) {
    return (
      <Container className="flex-row w-full items-start h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-500">Loading project...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="flex-row w-full items-start h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-red-500 mb-4">{error}</div>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="flex-row w-full items-start h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-500 mb-4">Project not found</div>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex-row w-full items-start h-screen max-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-hidden h-full">
        <main className="flex flex-col w-full h-full p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Heading className="text-start mb-2">{project.name}</Heading>
              <p className="text-gray-600 text-lg">{project.description}</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <p
                className={`text-lg font-semibold ${
                  statusColorMap[project.status] || "text-gray-500"
                }`}
              >
                {formatStatus(project.status)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Total Files
              </h3>
              <p className="text-lg font-semibold text-blue-600">
                {files.length}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Total Functions
              </h3>
              <p className="text-lg font-semibold text-green-600">
                {files.reduce(
                  (sum, file) => sum + (file.functions?.length || 0),
                  0
                )}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Total Classes
              </h3>
              <p className="text-lg font-semibold text-purple-600">
                {files.reduce(
                  (sum, file) => sum + (file.classes?.length || 0),
                  0
                )}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            {tree && (
              <button
                onClick={() => setActiveTab("structure")}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "structure"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Project Structure
              </button>
            )}
            <button
              onClick={() => setActiveTab("files")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "files"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Files Detail
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">
                    Project Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">
                        Created:
                      </span>
                      <p className="text-gray-600">
                        {project.created_at
                          ? new Date(project.created_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Last Updated:
                      </span>
                      <p className="text-gray-600">
                        {project.updated_at
                          ? new Date(project.updated_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Recent Files</h3>
                    <div className="space-y-2">
                      {files.slice(0, 5).map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center">
                            <FaPython className="text-green-600 mr-2" />
                            <span className="text-sm">{file.filename}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {(file.functions?.length || 0) +
                              (file.classes?.length || 0)}{" "}
                            items
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "structure" && tree && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">
                  Directory Structure
                </h3>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <TreeNode node={tree} />
                </div>
              </div>
            )}

            {activeTab === "files" && (
              <div>
                <h3 className="text-lg font-medium mb-4">File Details</h3>
                {files.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No files found in this project.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {files.map((file, index) => (
                      <FileCard key={index} file={file} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </Container>
  );
}

export default ViewProject;

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Container from "../components/Container";
import Sidebar from "../components/dashboard/Sidebar";
import {
  FaChevronRight,
  FaArrowLeft,
  FaFileAlt,
  FaDownload,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getProjectById } from "../services/projectService";
import {
  generateDocumentation,
  getDocumentationHistory,
  downloadDocumentation,
} from "../services/documentationService";
import { useToast } from "../contexts/ToastContext";

const Documentation = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documentationHistory, setDocumentationHistory] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Load project
        const projectRes = await getProjectById(projectId, token);
        setProject(projectRes.data);

        // Load documentation history
        try {
          const historyRes = await getDocumentationHistory(projectId, token);
          setDocumentationHistory(historyRes.data || []);
        } catch (error) {
          console.log("No documentation history found");
          setDocumentationHistory([]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        showError("Failed to load documentation data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleGenerateDocumentation = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await generateDocumentation(projectId, token);

      showSuccess("Documentation generated successfully!");

      // Reload history
      const historyRes = await getDocumentationHistory(projectId, token);
      setDocumentationHistory(historyRes.data || []);

      // Select the newly generated documentation
      if (response.data) {
        setSelectedDoc(response.data);
      }
    } catch (error) {
      console.error("Error generating documentation:", error);
      showError("Failed to generate documentation. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadDocumentation = async (docId, format) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      await downloadDocumentation(docId, format, token);
      showSuccess(`Documentation downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error downloading documentation:", error);
      showError("Failed to download documentation. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <FaCheck className="text-green-500" />;
      case "failed":
        return <FaTimes className="text-red-500" />;
      case "processing":
        return <FaSpinner className="text-blue-500 animate-spin" />;
      default:
        return <FaExclamationTriangle className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <Container className="flex-row w-full h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-500">Loading...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="flex-row w-full h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center text-sm text-gray-500 mb-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="hover:text-primary transition-colors"
              >
                Dashboard
              </button>
              <FaChevronRight className="mx-2 text-xs" />
              <button
                onClick={() =>
                  navigate(`/dashboard/projects/${projectId}/manage`)
                }
                className="hover:text-primary transition-colors"
              >
                Manage Project
              </button>
              <FaChevronRight className="mx-2 text-xs" />
              <span className="text-gray-800 font-medium">Documentation</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project?.name} - Documentation
                </h1>
                <p className="text-gray-600">
                  Generate and manage project documentation
                </p>
              </div>

              <button
                onClick={() =>
                  navigate(`/dashboard/projects/${projectId}/manage`)
                }
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft />
                Back to Project
              </button>
            </div>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex h-full gap-6">
            {/* Main Content */}
            <div
              className={`${
                selectedDoc ? "w-2/3" : "w-full"
              } bg-white rounded-lg shadow p-6`}
            >
              {/* Generate Documentation Section */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Generate New Documentation
                </h3>
                <p className="text-gray-600 mb-4">
                  Generate AI-powered documentation for your project based on
                  your current preferences and file selections.
                </p>
                <button
                  onClick={handleGenerateDocumentation}
                  disabled={generating}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Generating Documentation...
                    </>
                  ) : (
                    <>
                      <FaFileAlt />
                      Generate Documentation
                    </>
                  )}
                </button>
              </div>

              {/* Documentation History */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Documentation History
                </h3>
                {documentationHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaFileAlt size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No documentation generated yet</p>
                    <p className="text-sm">
                      Click "Generate Documentation" to create your first
                      documentation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentationHistory.map((doc) => (
                      <div
                        key={doc.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDoc?.id === doc.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.status)}
                            <h4 className="font-semibold text-gray-800">
                              Documentation #{doc.id}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                doc.status
                              )}`}
                            >
                              {doc.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <span>Format: {doc.format?.toUpperCase()}</span>
                            {doc.file_count && (
                              <span className="ml-4">
                                Files: {doc.file_count}
                              </span>
                            )}
                          </div>

                          {doc.status === "completed" && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadDocumentation(
                                    doc.id,
                                    doc.format || "markdown"
                                  );
                                }}
                                disabled={downloading}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {downloading ? (
                                  <FaSpinner
                                    className="animate-spin"
                                    size={12}
                                  />
                                ) : (
                                  <FaDownload size={12} />
                                )}
                                Download
                              </button>
                            </div>
                          )}
                        </div>

                        {doc.error_message && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            Error: {doc.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Documentation Preview Panel */}
            {selectedDoc && (
              <div className="w-1/3 bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    Documentation Details
                  </h3>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Status</h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedDoc.status)}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          selectedDoc.status
                        )}`}
                      >
                        {selectedDoc.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Generated On
                    </h4>
                    <p className="text-gray-600">
                      {formatDate(selectedDoc.created_at)}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Format</h4>
                    <p className="text-gray-600 capitalize">
                      {selectedDoc.format}
                    </p>
                  </div>

                  {selectedDoc.file_count && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Files Processed
                      </h4>
                      <p className="text-gray-600">{selectedDoc.file_count}</p>
                    </div>
                  )}

                  {selectedDoc.content_preview && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Preview
                      </h4>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 max-h-40 overflow-y-auto">
                        {selectedDoc.content_preview}
                      </div>
                    </div>
                  )}

                  {selectedDoc.status === "completed" && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() =>
                          handleDownloadDocumentation(
                            selectedDoc.id,
                            selectedDoc.format || "markdown"
                          )
                        }
                        disabled={downloading}
                        className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {downloading ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FaDownload />
                            Download {selectedDoc.format?.toUpperCase()}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {selectedDoc.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h4 className="font-semibold text-red-800 mb-2">Error</h4>
                      <p className="text-sm text-red-600">
                        {selectedDoc.error_message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Documentation;

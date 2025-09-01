import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Container from "../components/Container";
import Sidebar from "../components/dashboard/Sidebar";
import {
  FaChevronRight,
  FaArrowLeft,
  FaFolder,
  FaFolderOpen,
  FaPython,
  FaFileAlt,
  FaSpinner,
  FaDownload,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
} from "react-icons/fa";
import { getProjectById } from "../services/projectService";
import { getProjectFiles, uploadProjectFiles } from "../services/fileService";
import MonacoEditor from "@monaco-editor/react";
import { useToast } from "../contexts/ToastContext";

const Files = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState(new Set());
  const [expandedClasses, setExpandedClasses] = useState(new Set());

  useEffect(() => {
    const loadProject = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await getProjectById(projectId, token);
        setProject(response.data);
      } catch (error) {
        console.error("Error loading project:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadFiles = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await getProjectFiles(projectId, token);
        setFiles(response.data || []);
      } catch (error) {
        console.error("Error loading files:", error);
        showError("Failed to load project files.");
      }
    };

    loadProject();
    loadFiles();
  }, [projectId]);

  const buildFileTree = (files) => {
    const tree = {};

    files.forEach((file) => {
      const parts = file.filename.split("/");
      let current = tree;
      let currentPath = "";

      parts.forEach((part, index) => {
        if (currentPath) currentPath += "/";
        currentPath += part;

        if (!current[part]) {
          current[part] = {
            name: part,
            path: currentPath,
            isFile: index === parts.length - 1,
            children: {},
            data: index === parts.length - 1 ? file : null,
          };
        }
        current = current[part].children;
      });
    });

    return tree;
  };

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFunction = (functionName) => {
    const newExpanded = new Set(expandedFunctions);
    if (newExpanded.has(functionName)) {
      newExpanded.delete(functionName);
    } else {
      newExpanded.add(functionName);
    }
    setExpandedFunctions(newExpanded);
  };

  const toggleClass = (className) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(className)) {
      newExpanded.delete(className);
    } else {
      newExpanded.add(className);
    }
    setExpandedClasses(newExpanded);
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      Array.from(selectedFiles).forEach((file) => {
        formData.append("files", file);
      });

      await uploadProjectFiles(projectId, formData, token);

      // Reload files after upload
      const response = await getProjectFiles(projectId, token);
      setFiles(response.data || []);

      showSuccess(`Successfully uploaded ${selectedFiles.length} file(s)`);
    } catch (error) {
      console.error("Error uploading files:", error);
      showError("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const renderTreeItem = (item, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const children = Object.values(item.children);

    return (
      <div key={item.path}>
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (item.isFile) {
              setSelectedFile(item.data);
            } else {
              toggleFolder(item.path);
            }
          }}
        >
          {!item.isFile && (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <FaChevronDown size={10} />
              ) : (
                <FaChevronRight size={10} />
              )}
            </span>
          )}

          {item.isFile ? (
            <FaPython className="text-blue-600" size={16} />
          ) : isExpanded ? (
            <FaFolderOpen className="text-yellow-400" size={16} />
          ) : (
            <FaFolder className="text-yellow-400" size={16} />
          )}

          <span className="flex-1 text-sm">{item.name}</span>
        </div>

        {!item.isFile && isExpanded && (
          <div>{children.map((child) => renderTreeItem(child, depth + 1))}</div>
        )}
      </div>
    );
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

  const tree = buildFileTree(files);

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
              <span className="text-gray-800 font-medium">Files</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project?.name} - Files
                </h1>
                <p className="text-gray-600">
                  Manage and organize project files
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

        {/* Files Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex h-full gap-4">
            {/* File Tree */}
            <div
              className={`${
                selectedFile ? "w-1/2" : "w-full"
              } bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Project Files
                </h3>
                <div className="flex gap-2">
                  <label className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 cursor-pointer flex items-center gap-2">
                    {uploading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaDownload />
                    )}
                    {uploading ? "Uploading..." : "Upload Files"}
                    <input
                      type="file"
                      multiple
                      accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.hpp"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1 border rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.keys(tree).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaFileAlt size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Upload some files to get started</p>
                  </div>
                ) : (
                  Object.values(tree).map((item) => renderTreeItem(item))
                )}
              </div>
            </div>

            {/* File Details Panel */}
            {selectedFile && (
              <div className="w-1/2 bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    File Details
                  </h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center mb-2">
                    <FaPython className="text-blue-600 mr-2" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">
                        {selectedFile.filename.split("/").pop()}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {selectedFile.filename
                          .split("/")
                          .slice(0, -1)
                          .join("/")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Functions */}
                  <div>
                    <h5 className="text-lg font-semibold text-gray-800 mb-3">
                      Functions ({selectedFile.functions?.length || 0})
                    </h5>
                    {selectedFile.functions?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedFile.functions.map((func, index) => {
                          const isExpanded = expandedFunctions.has(
                            `${selectedFile.filename}-${func.name}`
                          );
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold text-blue-600">
                                  {func.name}
                                </h6>
                                <button
                                  onClick={() =>
                                    toggleFunction(
                                      `${selectedFile.filename}-${func.name}`
                                    )
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <FaChevronUp />
                                  ) : (
                                    <FaChevronDown />
                                  )}
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="rounded overflow-hidden border border-gray-200">
                                  <MonacoEditor
                                    height="200px"
                                    defaultLanguage="python"
                                    value={func.code}
                                    options={{
                                      readOnly: true,
                                      minimap: { enabled: false },
                                      fontSize: 12,
                                      scrollBeyondLastLine: false,
                                      wordWrap: "on",
                                    }}
                                    theme="vs-light"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No functions found</p>
                    )}
                  </div>

                  {/* Classes */}
                  <div>
                    <h5 className="text-lg font-semibold text-gray-800 mb-3">
                      Classes ({selectedFile.classes?.length || 0})
                    </h5>
                    {selectedFile.classes?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedFile.classes.map((cls, index) => {
                          const isExpanded = expandedClasses.has(
                            `${selectedFile.filename}-${cls.name}`
                          );
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold text-purple-600">
                                  {cls.name}
                                </h6>
                                <button
                                  onClick={() =>
                                    toggleClass(
                                      `${selectedFile.filename}-${cls.name}`
                                    )
                                  }
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <FaChevronUp />
                                  ) : (
                                    <FaChevronDown />
                                  )}
                                </button>
                              </div>
                              {isExpanded && (
                                <>
                                  <div className="rounded overflow-hidden border border-gray-200 mb-4">
                                    <MonacoEditor
                                      height="200px"
                                      defaultLanguage="python"
                                      value={cls.code}
                                      options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 12,
                                        scrollBeyondLastLine: false,
                                        wordWrap: "on",
                                      }}
                                      theme="vs-light"
                                    />
                                  </div>

                                  {/* Methods */}
                                  {cls.methods && cls.methods.length > 0 && (
                                    <div className="ml-4">
                                      <h6 className="font-semibold text-gray-700 mb-2">
                                        Methods ({cls.methods.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {cls.methods.map((method, mIdx) => (
                                          <div
                                            key={mIdx}
                                            className="bg-white rounded p-3 border border-gray-200"
                                          >
                                            <h6 className="font-medium text-green-600 mb-2">
                                              {method.name}
                                            </h6>
                                            <div className="rounded overflow-hidden border border-gray-200">
                                              <MonacoEditor
                                                height="150px"
                                                defaultLanguage="python"
                                                value={method.code}
                                                options={{
                                                  readOnly: true,
                                                  minimap: { enabled: false },
                                                  fontSize: 12,
                                                  scrollBeyondLastLine: false,
                                                  wordWrap: "on",
                                                }}
                                                theme="vs-light"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No classes found</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Files;

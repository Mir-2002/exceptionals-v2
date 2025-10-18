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
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import { getProjectById } from "../services/projectService";
import { getProjectFiles } from "../services/fileService";
import {
  getPreferences,
  updatePreferences,
  createDefaultPreferences,
} from "../services/preferencesService";
import MonacoEditor from "@monaco-editor/react";
import { useToast } from "../contexts/ToastContext";

const Preferences = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Preferences state
  const [exportFormat, setExportFormat] = useState("markdown");
  const [excludedDirs, setExcludedDirs] = useState(new Set());
  const [excludedFiles, setExcludedFiles] = useState(new Set());
  const [perFileExclusions, setPerFileExclusions] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Load project
        const projectRes = await getProjectById(projectId, token);
        setProject(projectRes.data);

        // Load files
        const filesRes = await getProjectFiles(projectId, token);
        setFiles(filesRes.data || []);

        // Load existing preferences
        try {
          const prefsRes = await getPreferences(projectId, token);
          const prefs = prefsRes.data;

          if (prefs.format) setExportFormat(prefs.format);

          if (prefs.directory_exclusion) {
            if (prefs.directory_exclusion.exclude_dirs) {
              setExcludedDirs(new Set(prefs.directory_exclusion.exclude_dirs));
            }
            if (prefs.directory_exclusion.exclude_files) {
              setExcludedFiles(
                new Set(prefs.directory_exclusion.exclude_files)
              );
            }
          }

          if (prefs.per_file_exclusion) {
            const perFileMap = {};
            prefs.per_file_exclusion.forEach((exclusion) => {
              perFileMap[exclusion.filename] = {
                exclude_functions: new Set(exclusion.exclude_functions || []),
                exclude_classes: new Set(exclusion.exclude_classes || []),
                exclude_methods: new Set(exclusion.exclude_methods || []),
              };
            });
            setPerFileExclusions(perFileMap);
          }
        } catch (error) {
          console.log("No existing preferences found, using defaults");
          const defaultPrefs = createDefaultPreferences();
          setExportFormat(defaultPrefs.format);
          setExcludedDirs(
            new Set(defaultPrefs.directory_exclusion.exclude_dirs)
          );
          setExcludedFiles(
            new Set(defaultPrefs.directory_exclusion.exclude_files)
          );
          setPerFileExclusions({});
        }
      } catch (error) {
        console.error("Error loading data:", error);
        showError("Failed to load preferences data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const handleDirToggle = (path, isChecked) => {
    const newExcludedDirs = new Set(excludedDirs);
    const newExcludedFiles = new Set(excludedFiles);

    if (isChecked) {
      newExcludedDirs.delete(path);
      files.forEach((file) => {
        if (file.filename.startsWith(path + "/")) {
          newExcludedFiles.delete(file.filename);
        }
      });
    } else {
      newExcludedDirs.add(path);
      files.forEach((file) => {
        if (file.filename.startsWith(path + "/")) {
          newExcludedFiles.add(file.filename);
        }
      });
    }

    setExcludedDirs(newExcludedDirs);
    setExcludedFiles(newExcludedFiles);
  };

  const handleFileToggle = (filename, isChecked) => {
    const newExcludedFiles = new Set(excludedFiles);

    if (isChecked) {
      newExcludedFiles.delete(filename);
    } else {
      newExcludedFiles.add(filename);
    }

    setExcludedFiles(newExcludedFiles);
  };

  const isItemExcluded = (item) => {
    if (item.isFile) {
      if (excludedFiles.has(item.path)) return true;
      return Array.from(excludedDirs).some((dir) =>
        item.path.startsWith(dir + "/")
      );
    } else {
      return excludedDirs.has(item.path);
    }
  };

  const handleItemExclusion = (filename, type, itemName, isChecked) => {
    const newPerFileExclusions = { ...perFileExclusions };

    if (!newPerFileExclusions[filename]) {
      newPerFileExclusions[filename] = {
        exclude_functions: new Set(),
        exclude_classes: new Set(),
        exclude_methods: new Set(),
      };
    }

    const exclusionSet = newPerFileExclusions[filename][`exclude_${type}s`];

    if (isChecked) {
      exclusionSet.delete(itemName);
    } else {
      exclusionSet.add(itemName);
    }

    setPerFileExclusions(newPerFileExclusions);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      const preferences = {
        format: exportFormat,
        directory_exclusion: {
          exclude_dirs: Array.from(excludedDirs),
          exclude_files: Array.from(excludedFiles),
        },
        per_file_exclusion: Object.entries(perFileExclusions)
          .map(([filename, exclusions]) => ({
            filename,
            exclude_functions: Array.from(exclusions.exclude_functions),
            exclude_classes: Array.from(exclusions.exclude_classes),
            exclude_methods: Array.from(exclusions.exclude_methods),
          }))
          .filter(
            (exclusion) =>
              exclusion.exclude_functions.length > 0 ||
              exclusion.exclude_classes.length > 0 ||
              exclusion.exclude_methods.length > 0
          ),
      };

      await updatePreferences(projectId, preferences, token);
      showSuccess("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      showError("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const Checkbox = ({ checked, onChange, className = "" }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 ${className}`}
    />
  );

  const renderTreeItem = (item, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const children = Object.values(item.children);
    const isExcluded = isItemExcluded(item);

    return (
      <div key={item.path}>
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <Checkbox
            checked={!isExcluded}
            onChange={(e) => {
              if (item.isFile) {
                handleFileToggle(item.path, e.target.checked);
              } else {
                handleDirToggle(item.path, e.target.checked);
              }
            }}
            className="flex-shrink-0"
          />

          {!item.isFile && (
            <button onClick={() => toggleFolder(item.path)} className="p-1">
              {isExpanded ? (
                <FaChevronDown size={12} />
              ) : (
                <FaChevronRight size={12} />
              )}
            </button>
          )}

          {item.isFile ? (
            <>
              <FaPython className="text-blue-600" size={16} />
              <span
                className="flex-1 text-sm cursor-pointer hover:text-blue-600"
                onClick={() => setSelectedFile(item.data)}
              >
                {item.name}
              </span>
            </>
          ) : (
            <>
              {isExpanded ? (
                <FaFolderOpen className="text-yellow-400" size={16} />
              ) : (
                <FaFolder className="text-yellow-400" size={16} />
              )}
              <span className="flex-1 text-sm">{item.name}</span>
            </>
          )}
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
              <span className="text-gray-800 font-medium">Preferences</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project?.name} - Preferences
                </h1>
                <p className="text-gray-600">
                  Configure documentation settings and exclusions
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

        {/* Preferences Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex h-full gap-4">
            {/* Main Content */}
            <div
              className={`${
                selectedFile ? "w-1/2" : "w-full"
              } bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Project Preferences
                </h3>

                {/* Export Format Selection */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    Export Format
                  </h4>
                  <div className="flex gap-4">
                    {["markdown", "html", "pdf"].map((format) => (
                      <label
                        key={format}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="format"
                          value={format}
                          checked={exportFormat === format}
                          onChange={(e) => setExportFormat(e.target.value)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary focus:ring-2"
                        />
                        <span className="capitalize">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="mb-6">
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>

              {/* File Tree */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Project Files & Directories
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Checked items will be included in documentation. Unchecked
                  items will be excluded.
                </p>
                <div className="space-y-1 border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {Object.values(tree).map((item) => renderTreeItem(item))}
                </div>
              </div>
            </div>

            {/* File Details Panel */}
            {selectedFile && (
              <div className="w-1/2 bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    File Item Preferences
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
                          const isExcluded =
                            perFileExclusions[
                              selectedFile.filename
                            ]?.exclude_functions?.has(func.name) || false;
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  checked={!isExcluded}
                                  onChange={(e) =>
                                    handleItemExclusion(
                                      selectedFile.filename,
                                      "function",
                                      func.name,
                                      e.target.checked
                                    )
                                  }
                                />
                                <h6 className="font-semibold text-blue-600">
                                  {func.name}
                                </h6>
                              </div>
                              <div className="rounded overflow-hidden border border-gray-200">
                                <MonacoEditor
                                  height="120px"
                                  defaultLanguage="python"
                                  value={func.code}
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    scrollBeyondLastLine: false,
                                    wordWrap: "on",
                                    lineNumbers: "on",
                                    roundedSelection: true,
                                    renderLineHighlight: "all",
                                    folding: false,
                                    renderIndentGuides: true,
                                    scrollbar: {
                                      verticalScrollbarSize: 6,
                                      horizontalScrollbarSize: 6,
                                      useShadows: false,
                                    },
                                  }}
                                  theme="vs-light"
                                />
                              </div>
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
                          const isClassExcluded =
                            perFileExclusions[
                              selectedFile.filename
                            ]?.exclude_classes?.has(cls.name) || false;
                          return (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  checked={!isClassExcluded}
                                  onChange={(e) =>
                                    handleItemExclusion(
                                      selectedFile.filename,
                                      "class",
                                      cls.name,
                                      e.target.checked
                                    )
                                  }
                                />
                                <h6 className="font-semibold text-purple-600">
                                  {cls.name}
                                </h6>
                              </div>
                              <div className="rounded overflow-hidden border border-gray-200 mb-4">
                                <MonacoEditor
                                  height="120px"
                                  defaultLanguage="python"
                                  value={cls.code}
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    scrollBeyondLastLine: false,
                                    wordWrap: "on",
                                    lineNumbers: "on",
                                    roundedSelection: true,
                                    renderLineHighlight: "all",
                                    folding: false,
                                    renderIndentGuides: true,
                                    scrollbar: {
                                      verticalScrollbarSize: 6,
                                      horizontalScrollbarSize: 6,
                                      useShadows: false,
                                    },
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
                                  <div className="space-y-3">
                                    {cls.methods.map((method, mIdx) => {
                                      const isMethodExcluded =
                                        perFileExclusions[
                                          selectedFile.filename
                                        ]?.exclude_methods?.has(method.name) ||
                                        false;
                                      return (
                                        <div
                                          key={mIdx}
                                          className="bg-white rounded p-3 border border-gray-200"
                                        >
                                          <div className="flex items-center gap-2 mb-2">
                                            <Checkbox
                                              checked={!isMethodExcluded}
                                              onChange={(e) =>
                                                handleItemExclusion(
                                                  selectedFile.filename,
                                                  "method",
                                                  method.name,
                                                  e.target.checked
                                                )
                                              }
                                            />
                                            <h6 className="font-medium text-green-600">
                                              {method.name}
                                            </h6>
                                          </div>
                                          <div className="rounded overflow-hidden border border-gray-200">
                                            <MonacoEditor
                                              height="100px"
                                              defaultLanguage="python"
                                              value={method.code}
                                              options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                                fontSize: 12,
                                                scrollBeyondLastLine: false,
                                                wordWrap: "on",
                                                lineNumbers: "on",
                                                roundedSelection: true,
                                                renderLineHighlight: "all",
                                                folding: false,
                                                renderIndentGuides: true,
                                                scrollbar: {
                                                  verticalScrollbarSize: 6,
                                                  horizontalScrollbarSize: 6,
                                                  useShadows: false,
                                                },
                                              }}
                                              theme="vs-light"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
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

export default Preferences;

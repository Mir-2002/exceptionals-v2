import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFileTree } from "../services/fileService";
import {
  getPreferences,
  updatePreferences,
} from "../services/preferenceService";
import { useAuth } from "../context/authContext";

const DEFAULT_EXCLUDE_FILES = ["__init__.py", "setup.py"];
const DEFAULT_EXCLUDE_DIRS = ["venv", "__pycache__"];

const SetFilePreferences = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const [fileTree, setFileTree] = useState(null);
  const [excludedFiles, setExcludedFiles] = useState([]);
  const [excludedDirs, setExcludedDirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState(new Set(["root"]));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const tree = await getFileTree(projectId, token);
      setFileTree(tree);

      try {
        const prefs = await getPreferences(projectId, token);
        setExcludedFiles(prefs.directory_exclusion?.exclude_files || []);
        setExcludedDirs(prefs.directory_exclusion?.exclude_dirs || []);
      } catch {
        setExcludedFiles([]);
        setExcludedDirs([]);
      }
      setLoading(false);
    };
    if (token) fetchData();
  }, [projectId, token]);

  // Helper: recursively collect all files/dirs under a node
  const collectAll = (node, files = [], dirs = []) => {
    if (node.type === "directory") {
      dirs.push(node.name);
      node.children?.forEach((child) => collectAll(child, files, dirs));
    } else if (node.type === "file") {
      files.push(node.name);
    }
    return { files, dirs };
  };

  // Handle checkbox change
  const handleCheck = (node, checked) => {
    if (node.type === "directory") {
      const { files, dirs } = collectAll(node, [], []);
      setExcludedDirs((prev) =>
        checked
          ? [...prev, node.name, ...dirs]
          : prev.filter((d) => d !== node.name && !dirs.includes(d))
      );
      setExcludedFiles((prev) =>
        checked ? [...prev, ...files] : prev.filter((f) => !files.includes(f))
      );
    } else {
      setExcludedFiles((prev) =>
        checked ? [...prev, node.name] : prev.filter((f) => f !== node.name)
      );
    }
  };

  // Check if node is excluded
  const isExcluded = (node) => {
    if (node.type === "directory") return excludedDirs.includes(node.name);
    return excludedFiles.includes(node.name);
  };

  // Expand/collapse folders
  const getNodePath = (node, parentPath = "") => {
    return parentPath ? `${parentPath}/${node.name}` : node.name;
  };

  const handleToggleFolder = (path) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Render file tree with checkboxes and expand/collapse
  const renderTree = (node, depth = 0, parentPath = "") => {
    const path = getNodePath(node, parentPath);
    const isFolder = node.type === "directory";
    const isOpen = openFolders.has(path);
    const style = { paddingLeft: `${depth * 20}px` };

    if (isFolder) {
      return (
        <div key={path} className="w-full">
          <div
            style={style}
            className="flex items-center flex-wrap overflow-hidden"
          >
            <span
              className="mr-2 text-blue-700 font-semibold cursor-pointer select-none"
              onClick={() => handleToggleFolder(path)}
              role="button"
              tabIndex={0}
            >
              {isOpen ? "📂" : "📁"}
            </span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isExcluded(node)}
                onChange={(e) => handleCheck(node, e.target.checked)}
              />
              <span
                className={isExcluded(node) ? "line-through text-gray-400" : ""}
              >
                {node.name}
              </span>
            </label>
          </div>
          {isOpen &&
            node.children &&
            node.children.map((child) => renderTree(child, depth + 1, path))}
        </div>
      );
    }
    return (
      <div
        key={node.id || path}
        style={style}
        className="flex items-center flex-wrap overflow-hidden w-full"
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isExcluded(node)}
            onChange={(e) => handleCheck(node, e.target.checked)}
          />
          <span
            className={isExcluded(node) ? "line-through text-gray-400" : ""}
          >
            📄 {node.name}
          </span>
        </label>
      </div>
    );
  };

  // Apply default exclusions
  const applyDefault = () => {
    setExcludedFiles(DEFAULT_EXCLUDE_FILES);
    setExcludedDirs(DEFAULT_EXCLUDE_DIRS);
  };

  // Save preferences to backend
  const handleSave = async () => {
    await updatePreferences(
      projectId,
      {
        directory_exclusion: {
          exclude_files: excludedFiles,
          exclude_dirs: excludedDirs,
        },
      },
      token
    );
    alert("Preferences saved!");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Set File Preferences</h2>
      <p className="mb-2 text-gray-600">
        Uncheck files or folders you want to exclude from documentation.
      </p>
      <button
        className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
        onClick={applyDefault}
      >
        Apply Default Exclusions
      </button>
      {loading ? (
        <div>Loading file tree...</div>
      ) : fileTree ? (
        <div>{renderTree(fileTree)}</div>
      ) : (
        <div className="text-gray-500">No files found.</div>
      )}
      <button
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleSave}
      >
        Save Preferences
      </button>
    </div>
  );
};

export default SetFilePreferences;

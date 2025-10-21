import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFile } from "../services/fileService";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Button, Card, LoadingSpinner, StatsCard } from "../components/ui";
import { normalizePath, getNodePath } from "../utils/pathUtils";
import { showSuccess, showError } from "../utils/toast";
import { FiFolder, FiFilter, FiFileText } from "react-icons/fi";

const DEFAULT_EXCLUDE_FILES = ["__init__.py", "setup.py"];
const DEFAULT_EXCLUDE_DIRS = ["venv", "__pycache__", "tests", "node_modules"];

const SetFilePreferences = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const {
    filePreferences,
    completeStep,
    loading: prefsLoading,
    fileTree,
    allFilesData,
    initializePreferences,
  } = usePreferences();

  // Local state
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [viewingFileName, setViewingFileName] = useState("");
  const [showFileBox, setShowFileBox] = useState(false);

  // Use normalized paths for exclusion
  const [excludedFiles, setExcludedFiles] = useState(
    (filePreferences?.exclude_files || []).map(normalizePath)
  );
  const [excludedDirs, setExcludedDirs] = useState(
    (filePreferences?.exclude_dirs || []).map(normalizePath)
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (token) {
        await initializePreferences(projectId, token);
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, token]);

  useEffect(() => {
    setExcludedFiles((filePreferences?.exclude_files || []).map(normalizePath));
    setExcludedDirs((filePreferences?.exclude_dirs || []).map(normalizePath));
  }, [filePreferences]);

  useEffect(() => {
    if (fileTree) {
      setOpenFolders(new Set([fileTree.path || fileTree.name || "root"]));
    }
  }, [fileTree]);

  const isFolder = (node) =>
    node?.type === "directory" ||
    node?.type === "folder" ||
    Array.isArray(node?.children);

  const uniq = (arr) => Array.from(new Set(arr));

  // Recursively collect normalized paths of all files/dirs under a node
  const collectAll = (node, files = [], dirs = [], parentPath = "") => {
    if (!node) return { files, dirs };
    const path = getNodePath(node, parentPath);
    if (isFolder(node)) {
      dirs.push(path);
      node.children?.forEach((child) => collectAll(child, files, dirs, path));
    } else {
      files.push(path);
    }
    return { files, dirs };
  };

  // Checkbox change
  const handleCheck = (node, checked, parentPath = "") => {
    const path = getNodePath(node, parentPath);
    if (isFolder(node)) {
      const { files, dirs } = collectAll(node, [], [], parentPath);
      if (checked) {
        // Include: remove from exclusions
        setExcludedDirs((prev) =>
          prev.filter((d) => d !== path && !dirs.includes(d))
        );
        setExcludedFiles((prev) => prev.filter((f) => !files.includes(f)));
      } else {
        // Exclude: add to exclusions (dedupe)
        setExcludedDirs((prev) => uniq([...prev, path, ...dirs]));
        setExcludedFiles((prev) => uniq([...prev, ...files]));
      }
    } else {
      if (checked) {
        setExcludedFiles((prev) => prev.filter((f) => f !== path));
      } else {
        setExcludedFiles((prev) => uniq([...prev, path]));
      }
    }
  };

  // Included = not excluded
  const isIncluded = (node, parentPath = "") => {
    const path = getNodePath(node, parentPath);
    if (isFolder(node)) return !excludedDirs.includes(path);
    return !excludedFiles.includes(path);
  };

  // Expand/collapse folders
  const handleToggleFolder = (path, e) => {
    e.stopPropagation();
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // File content view
  const handleViewFile = async (node) => {
    if (!node?.id) return;
    try {
      const data = await getFile(projectId, node.id, token);
      setSelectedFile(node.id);
      setViewingFileName(node.name);
      let code = "";
      if (data.functions?.length) {
        code += data.functions.map((f) => f.code).join("\n\n");
      }
      if (data.classes?.length) {
        code +=
          (code ? "\n\n" : "") + data.classes.map((c) => c.code).join("\n\n");
      }
      if (!code) code = "// No code found in functions or classes.";
      setFileContent(code);
      setShowFileBox(true);
    } catch (err) {
      showError("Failed to fetch file content. Please try again.");
    }
  };

  // Render tree with checkboxes and expand/collapse
  const renderTree = (node, depth = 0, parentPath = "") => {
    if (!node) return null;
    const path = getNodePath(node, parentPath);
    const nodeIsFolder = isFolder(node);
    const isOpen = openFolders.has(path);
    const included = isIncluded(node, parentPath);
    const style = { paddingLeft: `${depth * 20}px` };

    if (nodeIsFolder) {
      return (
        <div key={path} className="w-full">
          <div style={style} className="flex items-center gap-2 py-1">
            <span
              className="mr-2 text-blue-700 font-semibold cursor-pointer select-none"
              onClick={(e) => handleToggleFolder(path, e)}
              role="button"
              tabIndex={0}
            >
              {isOpen ? "📂" : "📁"}
            </span>
            <input
              type="checkbox"
              checked={included}
              onChange={(e) => {
                e.stopPropagation();
                handleCheck(node, e.target.checked, parentPath);
              }}
              className="flex-shrink-0"
            />
            <span
              className={`cursor-pointer select-none ${
                included ? "" : "line-through text-gray-400"
              }`}
              onClick={(e) => handleToggleFolder(path, e)}
            >
              {node.name}
            </span>
          </div>
          {isOpen &&
            node.children?.map((child) => renderTree(child, depth + 1, path))}
        </div>
      );
    }

    // File node
    return (
      <div
        key={node.id || path}
        style={style}
        className="flex items-center gap-2 py-1"
      >
        <span className="mr-2">📄</span>
        <input
          type="checkbox"
          checked={included}
          onChange={(e) => {
            e.stopPropagation();
            handleCheck(node, e.target.checked, parentPath);
          }}
          className="flex-shrink-0"
        />
        <span
          className={`cursor-pointer ${
            included ? "" : "line-through text-gray-400"
          }`}
          onClick={() => handleViewFile(node)}
        >
          {node.name}
        </span>
      </div>
    );
  };

  // Find all full paths matching default names
  const collectPathsByName = (
    node,
    targetNames = [],
    isDir,
    parentPath = "",
    acc = []
  ) => {
    if (!node) return acc;
    const path = getNodePath(node, parentPath);
    const folder = isFolder(node);
    const matches =
      folder === isDir && targetNames.includes(node.name) ? [path] : [];
    acc.push(...matches);
    if (folder) {
      node.children?.forEach((c) =>
        collectPathsByName(c, targetNames, isDir, path, acc)
      );
    }
    return acc;
  };

  const handleSave = async () => {
    const success = await completeStep(0, {
      exclude_files: excludedFiles,
      exclude_dirs: excludedDirs,
    });
    if (success) {
      showSuccess("File preferences saved successfully!");
      navigate(`/projects/${projectId}/preferences`);
    } else {
      showError("Failed to save preferences. Please try again.");
    }
  };

  const applyDefault = () => {
    const defaultFilePaths = collectPathsByName(
      fileTree,
      DEFAULT_EXCLUDE_FILES,
      false,
      ""
    );
    const defaultDirPaths = collectPathsByName(
      fileTree,
      DEFAULT_EXCLUDE_DIRS,
      true,
      ""
    );
    setExcludedFiles((prev) =>
      Array.from(new Set([...prev, ...defaultFilePaths.map(normalizePath)]))
    );
    setExcludedDirs((prev) =>
      Array.from(new Set([...prev, ...defaultDirPaths.map(normalizePath)]))
    );
  };

  const handleReset = () => {
    setExcludedFiles([]);
    setExcludedDirs([]);
  };

  // Calculate included files count based on local state
  const getLocalIncludedFilesCount = useCallback(() => {
    if (!fileTree) return 0;
    const countIncluded = (node, parentPath = "") => {
      const path = getNodePath(node, parentPath);
      if (isFolder(node)) {
        if (excludedDirs.includes(path)) return 0;
        return (node.children || []).reduce(
          (sum, child) => sum + countIncluded(child, path),
          0
        );
      } else {
        return excludedFiles.includes(path) ? 0 : 1;
      }
    };
    return countIncluded(fileTree);
  }, [fileTree, excludedFiles, excludedDirs]);

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 overflow-x-hidden justify-center">
      {/* Main Preferences Box */}
      <div className="w-[500px] p-6 border rounded-lg shadow bg-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <FiFilter className="text-blue-600" />
          <h2 className="text-xl font-bold">Set File Preferences</h2>
        </div>
        <p className="mb-2 text-gray-600">
          Uncheck files or folders you want to exclude from documentation.
          Everything is included by default.
        </p>
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            onClick={applyDefault}
          >
            Apply Default Exclusions
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset Preferences
          </Button>
        </div>
        {prefsLoading || loading ? (
          <LoadingSpinner text="Loading file tree..." />
        ) : fileTree ? (
          <div className="border rounded p-4 max-h-96 overflow-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <FiFolder />
              <span>Project files</span>
            </div>
            {renderTree(fileTree)}
          </div>
        ) : (
          <div className="text-gray-500">No files found.</div>
        )}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
          >
            Back to Overview
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={prefsLoading}
          >
            {prefsLoading ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </div>

      {/* File Content Box */}
      {showFileBox && (
        <div className="w-[500px] bg-gray-50 p-6 rounded border shadow h-fit">
          <div className="flex items-center gap-2 mb-2">
            <FiFileText className="text-blue-600" />
            <h3 className="text-lg font-bold break-words">
              {viewingFileName
                ? `Viewing: ${viewingFileName}`
                : "File Contents"}
            </h3>
          </div>
          <div className="w-full max-h-[70vh] overflow-auto rounded">
            <SyntaxHighlighter
              language="python"
              style={docco}
              customStyle={{
                fontSize: "0.9rem",
                borderRadius: "8px",
                background: "#f8fafc",
                margin: 0,
                padding: "1rem",
                minHeight: "200px",
                maxWidth: "100%",
                overflowX: "auto",
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {fileContent}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetFilePreferences;

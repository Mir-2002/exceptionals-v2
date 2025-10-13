import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";

const normalizePath = (p) =>
  (p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
const getNodePath = (node, parentPath = "") =>
  normalizePath(
    node?.path || (parentPath ? `${parentPath}/${node.name}` : node?.name || "")
  );

const SetFunctionClassPreference = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const {
    initializePreferences,
    completeStep,
    getFilesWithContent,
    loading: prefsLoading,
    filesLoading,
    fileTree,
    allFilesData,
    isFileIncluded,
    preferences,
  } = usePreferences();

  const [selectedFileId, setSelectedFileId] = useState(null);

  // Local editable map of per-file exclusions
  const [perFileMap, setPerFileMap] = useState({});

  // Initialize data via context
  useEffect(() => {
    if (!token) return;
    if (!fileTree || allFilesData.length === 0) {
      initializePreferences(projectId, token);
    }
  }, [projectId, token, initializePreferences, fileTree, allFilesData.length]);

  // Populate local perFileMap from persisted prefs
  useEffect(() => {
    const list = Array.isArray(preferences?.per_file_exclusion)
      ? preferences.per_file_exclusion
      : [];
    const map = {};
    list.forEach((e) => {
      const key = normalizePath(e.filename);
      map[key] = {
        exclude_functions: Array.isArray(e.exclude_functions)
          ? e.exclude_functions
          : [],
        exclude_classes: Array.isArray(e.exclude_classes)
          ? e.exclude_classes
          : [],
      };
    });
    setPerFileMap(map);
  }, [preferences?.per_file_exclusion]);

  const filesWithContent = getFilesWithContent();
  const selectedFile = allFilesData.find(
    (file) => String(file.id) === String(selectedFileId)
  );
  const selectedKey = useMemo(
    () => normalizePath(selectedFile?.path || selectedFile?.name || ""),
    [selectedFile]
  );

  const excludedForSelected = perFileMap[selectedKey] || {
    exclude_functions: [],
    exclude_classes: [],
  };

  const setExcludedForSelected = (updater) => {
    setPerFileMap((prev) => {
      const current = prev[selectedKey] || {
        exclude_functions: [],
        exclude_classes: [],
      };
      const next = updater(current);
      return { ...prev, [selectedKey]: next };
    });
  };

  const handleToggle = (name, type) => {
    setExcludedForSelected((curr) => {
      const arr = new Set(curr[type] || []);
      if (arr.has(name)) arr.delete(name);
      else arr.add(name);
      return { ...curr, [type]: Array.from(arr) };
    });
  };

  const handleBulkToggle = (file, type, shouldExclude) => {
    const names = (file[type] || []).map((i) => i.name);
    setExcludedForSelected((curr) => {
      const otherType =
        type === "functions" ? "exclude_classes" : "exclude_functions";
      const key =
        type === "functions" ? "exclude_functions" : "exclude_classes";
      const base = new Set(curr[key] || []);
      if (shouldExclude) {
        names.forEach((n) => base.add(n));
      } else {
        names.forEach((n) => base.delete(n));
      }
      return {
        ...curr,
        [key]: Array.from(base),
        [otherType]: curr[otherType] || [],
      };
    });
  };

  const handleReset = () => {
    if (!selectedKey) return;
    setPerFileMap((prev) => {
      const next = { ...prev };
      next[selectedKey] = { exclude_functions: [], exclude_classes: [] };
      return next;
    });
  };

  const handleSave = async () => {
    // Convert map -> array for backend, keep normalized paths
    const per_file_exclusion = Object.entries(perFileMap)
      .map(([filename, val]) => ({
        filename: normalizePath(filename),
        exclude_functions: val.exclude_functions || [],
        exclude_classes: val.exclude_classes || [],
      }))
      .filter(
        (e) =>
          (e.exclude_functions && e.exclude_functions.length > 0) ||
          (e.exclude_classes && e.exclude_classes.length > 0)
      );

    const success = await completeStep(1, per_file_exclusion);
    if (success) navigate(`/projects/${projectId}/preferences`);
    else alert("Failed to save preferences. Please try again.");
  };

  // Render only directories that contain at least one visible file with content
  const renderFileTree = (node, depth = 0, parentPath = "") => {
    if (!node) return null;

    const path = getNodePath(node, parentPath);

    // Respect file preferences using normalized path (hide excluded dirs/files)
    if (!isFileIncluded(node.name, path)) return null;

    const isDir =
      node.type === "directory" ||
      node.type === "folder" ||
      Array.isArray(node.children);

    if (!isDir) {
      // File: only show if it has functions/classes
      const hasContent = filesWithContent.some(
        (f) =>
          String(f.id) === String(node.id) ||
          (f.path &&
            node.path &&
            normalizePath(f.path) === normalizePath(node.path))
      );
      if (!hasContent) return null;

      return (
        <div
          key={node.id || path || node.name}
          style={{ paddingLeft: `${depth * 18}px` }}
          className={`py-1 cursor-pointer truncate ${
            String(selectedFileId) === String(node.id)
              ? "bg-blue-100 rounded"
              : ""
          }`}
          onClick={() => setSelectedFileId(String(node.id))}
          title={path}
        >
          📄 {node.name}
        </div>
      );
    }

    // Directory: render children first and prune empty dirs
    const children =
      node.children
        ?.map((c) => renderFileTree(c, depth + 1, path))
        .filter(Boolean) || [];
    if (children.length === 0) return null;

    return (
      <div key={path || node.name}>
        <div
          style={{ paddingLeft: `${depth * 18}px` }}
          className="py-1 font-semibold text-blue-700"
        >
          📁 {node.name}
        </div>
        {children}
      </div>
    );
  };

  if (prefsLoading || filesLoading || !fileTree) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 justify-center">
      {/* Left: File Tree */}
      <div className="w-[320px] p-4 border rounded-lg shadow bg-white flex flex-col">
        <h3 className="text-lg font-bold mb-2">Included Files</h3>
        <div className="overflow-auto max-h-[70vh]">
          {renderFileTree(fileTree) || (
            <p className="text-sm text-gray-500">
              No files with functions/classes in included paths.
            </p>
          )}
        </div>
        <button
          className="mt-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => navigate(`/projects/${projectId}/preferences`)}
        >
          Back to Overview
        </button>
      </div>

      {/* Right: Details Panel */}
      <div className="flex-1 p-6 border rounded-lg shadow bg-white min-h-[70vh]">
        <h2 className="text-xl font-bold mb-4">
          Set Function/Class Preferences
        </h2>
        <p className="mb-4 text-gray-600">
          Exclude functions or classes from the documentation.
        </p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 mb-4"
          disabled={!selectedFile}
        >
          Reset Changes (Selected File)
        </button>

        {!selectedFile ? (
          <div className="text-center text-gray-500 py-8">
            Select a file to view its contents.
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-800">
              {selectedFile.name}
            </h3>

            {selectedFile.functions?.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Functions</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleBulkToggle(selectedFile, "functions", false)
                      }
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Include All
                    </button>
                    <button
                      onClick={() =>
                        handleBulkToggle(selectedFile, "functions", true)
                      }
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Exclude All
                    </button>
                  </div>
                </div>
                {selectedFile.functions.map((func) => (
                  <div
                    key={func.name}
                    className="border rounded p-3 mb-2 bg-gray-50"
                  >
                    <label className="flex items-center gap-2 font-mono">
                      <input
                        type="checkbox"
                        checked={
                          !excludedForSelected.exclude_functions.includes(
                            func.name
                          )
                        }
                        onChange={() =>
                          handleToggle(func.name, "exclude_functions")
                        }
                      />
                      <span
                        className={
                          excludedForSelected.exclude_functions.includes(
                            func.name
                          )
                            ? "line-through text-gray-400"
                            : ""
                        }
                      >
                        {func.name}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {selectedFile.classes?.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Classes</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleBulkToggle(selectedFile, "classes", false)
                      }
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Include All
                    </button>
                    <button
                      onClick={() =>
                        handleBulkToggle(selectedFile, "classes", true)
                      }
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Exclude All
                    </button>
                  </div>
                </div>
                {selectedFile.classes.map((cls) => (
                  <div
                    key={cls.name}
                    className="border rounded p-3 mb-2 bg-gray-50"
                  >
                    <label className="flex items-center gap-2 font-mono">
                      <input
                        type="checkbox"
                        checked={
                          !excludedForSelected.exclude_classes.includes(
                            cls.name
                          )
                        }
                        onChange={() =>
                          handleToggle(cls.name, "exclude_classes")
                        }
                      />
                      <span
                        className={
                          excludedForSelected.exclude_classes.includes(cls.name)
                            ? "line-through text-gray-400"
                            : ""
                        }
                      >
                        {cls.name}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {!selectedFile.functions?.length &&
              !selectedFile.classes?.length && (
                <div className="text-center text-gray-500 py-4">
                  This file contains no functions or classes.
                </div>
              )}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={prefsLoading}
          >
            {prefsLoading ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetFunctionClassPreference;

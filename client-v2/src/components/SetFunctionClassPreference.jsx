import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

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
  const [perFileMap, setPerFileMap] = useState({});

  useEffect(() => {
    if (!token) return;
    if (!fileTree || allFilesData.length === 0) {
      initializePreferences(projectId, token);
    }
  }, [projectId, token, initializePreferences, fileTree, allFilesData.length]);

  useEffect(() => {
    const list = Array.isArray(preferences?.per_file_exclusion)
      ? preferences.per_file_exclusion
      : [];
    const map = {};
    list.forEach((e) => {
      const key = normalizePath(e?.filename || "");
      if (!key) return;
      map[key] = {
        exclude_functions: Array.isArray(e.exclude_functions)
          ? e.exclude_functions
          : [],
        exclude_classes: Array.isArray(e.exclude_classes)
          ? e.exclude_classes
          : [],
        exclude_methods: Array.isArray(e.exclude_methods)
          ? e.exclude_methods
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
    () =>
      normalizePath(
        selectedFile?.path || selectedFile?.name || selectedFile?.filename || ""
      ),
    [selectedFile]
  );
  const excludedForSelected = perFileMap[selectedKey] || {
    exclude_functions: [],
    exclude_classes: [],
    exclude_methods: [],
  };

  const setExcludedForSelected = (updater) => {
    if (!selectedKey) return;
    setPerFileMap((prev) => {
      const current = prev[selectedKey] || {
        exclude_functions: [],
        exclude_classes: [],
        exclude_methods: [],
      };
      const next = updater(current);
      return { ...prev, [selectedKey]: next };
    });
  };

  const handleToggle = (name, exclusionKey, className = null) => {
    setExcludedForSelected((curr) => {
      const arr = new Set(curr[exclusionKey] || []);
      if (arr.has(name)) arr.delete(name);
      else arr.add(name);

      // If excluding a class, also exclude all its methods
      if (exclusionKey === "exclude_classes" && className === null) {
        const cls = selectedFile.classes?.find((c) => c.name === name);
        if (cls && cls.methods?.length) {
          const methodArr = new Set(curr["exclude_methods"] || []);
          if (!arr.has(name)) {
            cls.methods.forEach((m) => methodArr.delete(m.name));
          } else {
            cls.methods.forEach((m) => methodArr.add(m.name));
          }
          return {
            ...curr,
            [exclusionKey]: Array.from(arr),
            exclude_methods: Array.from(methodArr),
          };
        }
      }

      return { ...curr, [exclusionKey]: Array.from(arr) };
    });
  };

  const handleBulkToggle = (file, type, shouldExclude) => {
    let names = [];
    let exclusionKey = "";

    if (type === "functions") {
      names = (file.functions || []).map((i) => i.name);
      exclusionKey = "exclude_functions";
    } else if (type === "classes") {
      names = (file.classes || []).map((i) => i.name);
      exclusionKey = "exclude_classes";
    } else if (type === "methods") {
      names = [];
      (file.classes || []).forEach((cls) => {
        (cls.methods || []).forEach((method) => {
          names.push(method.name);
        });
      });
      exclusionKey = "exclude_methods";
    }

    setExcludedForSelected((curr) => {
      const base = new Set(curr[exclusionKey] || []);
      if (shouldExclude) names.forEach((n) => base.add(n));
      else names.forEach((n) => base.delete(n));
      return { ...curr, [exclusionKey]: Array.from(base) };
    });
  };

  const handleResetSelected = () => {
    if (!selectedKey) return;
    setPerFileMap((prev) => ({
      ...prev,
      [selectedKey]: {
        exclude_functions: [],
        exclude_classes: [],
        exclude_methods: [],
      },
    }));
  };

  const handleSave = async () => {
    const per_file_exclusion = Object.entries(perFileMap)
      .map(([key, val]) => {
        const normalizedKey = normalizePath(key);
        if (!normalizedKey) return null;
        const fileObj = allFilesData.find(
          (f) =>
            normalizePath(f.path || f.name || f.filename || "") ===
            normalizedKey
        );
        const filename = normalizePath(
          fileObj?.path || fileObj?.name || fileObj?.filename || normalizedKey
        );
        if (!filename) return null;
        const exclude_functions = Array.isArray(val.exclude_functions)
          ? val.exclude_functions.filter(Boolean)
          : [];
        const exclude_classes = Array.isArray(val.exclude_classes)
          ? val.exclude_classes.filter(Boolean)
          : [];
        const exclude_methods = Array.isArray(val.exclude_methods)
          ? val.exclude_methods.filter(Boolean)
          : [];

        if (
          exclude_functions.length === 0 &&
          exclude_classes.length === 0 &&
          exclude_methods.length === 0
        )
          return null;

        return {
          filename,
          exclude_functions,
          exclude_classes,
          exclude_methods,
        };
      })
      .filter(Boolean);

    console.log("Saving per_file_exclusion payload:", per_file_exclusion);

    const success = await completeStep(1, per_file_exclusion);
    if (success) navigate(`/projects/${projectId}/preferences`);
    else alert("Failed to save preferences. Please try again.");
  };

  const renderFileTree = useCallback(
    (node, depth = 0, parentPath = "") => {
      if (!node) return null;
      const path = getNodePath(node, parentPath);

      if (!isFileIncluded(node.name, path)) return null;

      const isDir =
        node.type === "directory" ||
        node.type === "folder" ||
        Array.isArray(node.children);

      if (!isDir) {
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
    },
    [filesWithContent, isFileIncluded, selectedFileId, setSelectedFileId]
  );

  if (prefsLoading || filesLoading || !fileTree) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 justify-center">
      {/* Left Pane: File Tree */}
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

      {/* Right Pane: Details */}
      <div className="flex-1 p-6 border rounded-lg shadow bg-white min-h-[70vh]">
        <h2 className="text-xl font-bold mb-4">
          Set Function/Class Preferences
        </h2>
        <p className="mb-4 text-gray-600">
          Exclude functions or classes from the documentation.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleResetSelected}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
            disabled={!selectedFile}
          >
            Reset (Selected File)
          </button>
        </div>

        {!selectedFile ? (
          <div className="text-center text-gray-500 py-8">
            Select a file to view its contents.
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-800 break-all">
              {selectedFile.path || selectedFile.name}
            </h3>

            {/* Functions */}
            {selectedFile.functions?.length > 0 && (
              <div className="mb-6">
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
                {selectedFile.functions.map((func) => {
                  const excluded =
                    excludedForSelected.exclude_functions.includes(func.name);
                  return (
                    <div
                      key={func.name}
                      className="border rounded p-3 mb-2 bg-gray-50"
                    >
                      <label className="flex items-center gap-2 font-mono">
                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() =>
                            handleToggle(func.name, "exclude_functions")
                          }
                        />
                        <span
                          className={
                            excluded ? "line-through text-gray-400" : ""
                          }
                        >
                          {func.name}
                        </span>
                      </label>
                      {/* Function code */}
                      {func.code && (
                        <SyntaxHighlighter
                          language="python"
                          style={docco}
                          customStyle={{
                            fontSize: "0.9em",
                            borderRadius: "0.5em",
                            marginTop: "0.5em",
                          }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {func.code}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Classes (with methods directly under each class) */}
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
                {selectedFile.classes.map((cls) => {
                  const excluded = excludedForSelected.exclude_classes.includes(
                    cls.name
                  );
                  return (
                    <div
                      key={cls.name}
                      className="border rounded p-3 mb-2 bg-gray-50"
                    >
                      <label className="flex items-center gap-2 font-mono">
                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() =>
                            handleToggle(cls.name, "exclude_classes")
                          }
                        />
                        <span
                          className={
                            excluded ? "line-through text-gray-400" : ""
                          }
                        >
                          {cls.name}
                        </span>
                      </label>
                      {/* Class code */}
                      {cls.code && (
                        <SyntaxHighlighter
                          language="python"
                          style={docco}
                          customStyle={{
                            fontSize: "0.9em",
                            borderRadius: "0.5em",
                            marginTop: "0.5em",
                          }}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {cls.code}
                        </SyntaxHighlighter>
                      )}
                      {/* Methods for this class */}
                      {cls.methods?.length > 0 && (
                        <div className="ml-6 mt-2">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Methods:
                          </h5>
                          {cls.methods.map((method) => {
                            const excludedMethod =
                              excludedForSelected.exclude_methods.includes(
                                method.name
                              );
                            return (
                              <div
                                key={`${cls.name}.${method.name}`}
                                className="border rounded p-2 mb-2 bg-gray-50"
                              >
                                <label className="flex items-center gap-2 font-mono">
                                  <input
                                    type="checkbox"
                                    checked={!excludedMethod}
                                    onChange={() =>
                                      handleToggle(
                                        method.name,
                                        "exclude_methods",
                                        cls.name
                                      )
                                    }
                                  />
                                  <span
                                    className={
                                      excludedMethod
                                        ? "line-through text-gray-400"
                                        : ""
                                    }
                                  >
                                    {method.name}
                                  </span>
                                </label>
                                {/* Method code */}
                                {method.code && (
                                  <SyntaxHighlighter
                                    language="python"
                                    style={docco}
                                    customStyle={{
                                      fontSize: "0.9em",
                                      borderRadius: "0.5em",
                                      marginTop: "0.5em",
                                    }}
                                    wrapLines={true}
                                    wrapLongLines={true}
                                  >
                                    {method.code}
                                  </SyntaxHighlighter>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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

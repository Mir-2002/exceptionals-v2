import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { usePreferences } from "../context/preferenceContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";

const SetFunctionClassPreference = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Preference context
  const {
    functionClassPreferences,
    completeStep,
    filePreferences,
    getFilesWithContent,
    getFunctionClassCounts,
    loading: prefsLoading,
    filesLoading,
    fileTree,
    isFileIncluded,
    allFilesData,
  } = usePreferences();

  // Local state for exclusions
  const [excludedFunctions, setExcludedFunctions] = useState(
    functionClassPreferences?.excluded_functions || []
  );
  const [excludedClasses, setExcludedClasses] = useState(
    functionClassPreferences?.excluded_classes || []
  );

  // Use file id for selection (unique)
  const [selectedFileId, setSelectedFileId] = useState(null);

  // Update local state when context changes
  useEffect(() => {
    setExcludedFunctions(functionClassPreferences?.excluded_functions || []);
    setExcludedClasses(functionClassPreferences?.excluded_classes || []);
  }, [functionClassPreferences]);

  // Context selectors
  const filesWithContent = getFilesWithContent();

  // Find selected file by matching the file ID correctly
  const selectedFile = selectedFileId
    ? allFilesData.find((file) => file.id === selectedFileId) ||
      filesWithContent.find((file) => file.id === selectedFileId) ||
      null
    : null;

  // Debug logging
  useEffect(() => {
    if (selectedFileId) {
      console.log("Selected file ID:", selectedFileId);
      console.log(
        "All files data IDs:",
        allFilesData.map((f) => ({ id: f.id, name: f.filename }))
      );
      console.log("Selected file found:", selectedFile);
    }
  }, [selectedFileId, allFilesData, selectedFile]);

  // Handlers
  const handleFunctionToggle = (funcName) => {
    setExcludedFunctions((prev) =>
      prev.includes(funcName)
        ? prev.filter((f) => f !== funcName)
        : [...prev, funcName]
    );
  };

  const handleClassToggle = (className) => {
    setExcludedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const excludeAllFunctions = (file) => {
    const allFuncNames = (file.functions || []).map((f) => f.name);
    setExcludedFunctions((prev) =>
      Array.from(new Set([...prev, ...allFuncNames]))
    );
  };

  const includeAllFunctions = (file) => {
    const allFuncNames = (file.functions || []).map((f) => f.name);
    setExcludedFunctions((prev) =>
      prev.filter((f) => !allFuncNames.includes(f))
    );
  };

  const excludeAllClasses = (file) => {
    const allClassNames = (file.classes || []).map((c) => c.name);
    setExcludedClasses((prev) =>
      Array.from(new Set([...prev, ...allClassNames]))
    );
  };

  const includeAllClasses = (file) => {
    const allClassNames = (file.classes || []).map((c) => c.name);
    setExcludedClasses((prev) =>
      prev.filter((c) => !allClassNames.includes(c))
    );
  };

  const handleReset = () => {
    setExcludedFunctions([]);
    setExcludedClasses([]);
  };

  const handleSave = async () => {
    const success = await completeStep(1, {
      excluded_functions: excludedFunctions,
      excluded_classes: excludedClasses,
    });
    if (success) {
      navigate(`/projects/${projectId}/preferences`);
    } else {
      alert("Failed to save preferences.");
    }
  };

  // Render file tree (included files only)
  const renderFileTree = (node, depth = 0, parentPath = "") => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isFolder =
      node.type === "directory" || (node.children && node.children.length > 0);

    if (isFolder) {
      if (filePreferences?.exclude_dirs?.includes(node.name)) return null;
      const children = (node.children || [])
        .map((child) => renderFileTree(child, depth + 1, path))
        .filter(Boolean);
      if (children.length === 0) return null;
      return (
        <div key={path}>
          <div
            style={{ paddingLeft: `${depth * 18}px` }}
            className="flex items-center gap-2 py-1"
          >
            <span className="font-semibold text-blue-700">{node.name}</span>
          </div>
          {children}
        </div>
      );
    } else {
      if (!isFileIncluded(node.name, path)) return null;

      // Check if this file exists in our data and has content
      const hasContent = allFilesData.some(
        (file) =>
          file.id === node.id &&
          ((file.functions && file.functions.length > 0) ||
            (file.classes && file.classes.length > 0))
      );

      if (!hasContent) return null;

      return (
        <div
          key={node.id || path}
          style={{ paddingLeft: `${depth * 18}px` }}
          className={`flex items-center gap-2 py-1 cursor-pointer ${
            selectedFileId === node.id ? "bg-blue-100 rounded" : ""
          }`}
          onClick={() => {
            console.log("Clicking file:", node.name, "ID:", node.id);
            setSelectedFileId(node.id);
          }}
        >
          <span>📄</span>
          <span className="truncate">{node.name}</span>
        </div>
      );
    }
  };

  if (prefsLoading || filesLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <div className="text-center">Loading functions and classes...</div>
      </div>
    );
  }

  if (!filePreferences) {
    return (
      <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <div className="text-center text-red-600">
          Please complete file preferences first.
        </div>
        <div className="flex justify-center mt-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
          >
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 overflow-x-hidden justify-center">
      {/* Left: File Tree */}
      <div className="w-[320px] p-4 border rounded-lg shadow bg-white flex flex-col">
        <h3 className="text-lg font-bold mb-2">Included Files</h3>
        <div className="overflow-auto max-h-[70vh]">
          {fileTree ? (
            renderFileTree(fileTree)
          ) : (
            <div className="text-gray-500">No files found.</div>
          )}
        </div>
        <button
          className="mt-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => navigate(`/projects/${projectId}/preferences`)}
        >
          Back to Overview
        </button>
      </div>

      {/* Right: Details */}
      <div className="flex-1 p-6 border rounded-lg shadow bg-white min-h-[70vh]">
        <h2 className="text-xl font-bold mb-4">
          Set Function/Class Preferences
        </h2>
        <p className="mb-4 text-gray-600">
          Exclude functions or classes from documentation. Use the buttons for
          quick actions.
        </p>

        <div className="mb-4 flex gap-2">
          <button
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
            onClick={handleReset}
          >
            Reset Preferences
          </button>
        </div>

        {!selectedFile ? (
          <div className="text-center text-gray-500 py-8">
            <p>
              Select a file from the left to view its functions and classes.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-800">
              {selectedFile.filename || selectedFile.name}
              {(selectedFile.path || selectedFile.filename) && (
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedFile.path || selectedFile.filename})
                </span>
              )}
            </h3>

            {/* Functions */}
            {selectedFile.functions && selectedFile.functions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Functions</h4>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                      onClick={() => includeAllFunctions(selectedFile)}
                    >
                      Include All
                    </button>
                    <button
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      onClick={() => excludeAllFunctions(selectedFile)}
                    >
                      Exclude All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {selectedFile.functions.map((func) => (
                    <div
                      key={func.name}
                      className="border rounded-lg p-4 bg-gray-50 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={!excludedFunctions.includes(func.name)}
                          onChange={() => handleFunctionToggle(func.name)}
                          className="flex-shrink-0"
                        />
                        <span
                          className={`font-mono text-base ${
                            excludedFunctions.includes(func.name)
                              ? "line-through text-gray-400"
                              : "text-blue-900"
                          }`}
                        >
                          {func.name}
                        </span>
                      </div>
                      {func.code && (
                        <SyntaxHighlighter
                          language="python"
                          style={docco}
                          customStyle={{
                            borderRadius: "6px",
                            fontSize: "13px",
                            margin: 0,
                            padding: "12px",
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            maxHeight: "180px",
                            overflow: "auto",
                          }}
                        >
                          {func.code}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classes */}
            {selectedFile.classes && selectedFile.classes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Classes</h4>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                      onClick={() => includeAllClasses(selectedFile)}
                    >
                      Include All
                    </button>
                    <button
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      onClick={() => excludeAllClasses(selectedFile)}
                    >
                      Exclude All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {selectedFile.classes.map((cls) => (
                    <div
                      key={cls.name}
                      className="border rounded-lg p-4 bg-gray-50 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={!excludedClasses.includes(cls.name)}
                          onChange={() => handleClassToggle(cls.name)}
                          className="flex-shrink-0"
                        />
                        <span
                          className={`font-mono text-base ${
                            excludedClasses.includes(cls.name)
                              ? "line-through text-gray-400"
                              : "text-purple-900"
                          }`}
                        >
                          {cls.name}
                        </span>
                      </div>
                      {cls.code && (
                        <SyntaxHighlighter
                          language="python"
                          style={docco}
                          customStyle={{
                            borderRadius: "6px",
                            fontSize: "13px",
                            margin: 0,
                            padding: "12px",
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            maxHeight: "180px",
                            overflow: "auto",
                          }}
                        >
                          {cls.code}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedFile.functions?.length &&
              !selectedFile.classes?.length && (
                <div className="text-gray-500 py-4">
                  No functions or classes found in this file.
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

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePreferences } from "../context/preferenceContext";
import { useAuth } from "../context/authContext";
import { getDocumentationPlan } from "../services/documentationService";
import { Button, Card, StatsCard } from "../components/ui";
import { normalizePath, basename, getNodePath } from "../utils/pathUtils";
import { showSuccess, showError } from "../utils/toast";

const FinalizePreference = () => {
  const {
    fileTree,
    allFilesData,
    perFileExclusion,
    isFileIncluded,
    completeStep,
    preferences,
  } = usePreferences();

  const { token } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();

  // Initialize format from either project_settings or root fallback
  const initialFormat =
    preferences?.project_settings?.format || preferences?.format || "HTML";
  const [docFormat, setDocFormat] = useState(initialFormat);
  const [documentationPlan, setDocumentationPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Keep local state synced if preferences refetched/changed
  // Only run on mount
  useEffect(() => {
    const newFmt = preferences?.project_settings?.format || preferences?.format;
    if (newFmt) setDocFormat(newFmt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("Preferences changed, reloading plan:", preferences); // Debug log
    loadDocumentationPlan();
  }, [
    projectId,
    token,
    preferences?.directory_exclusion,
    preferences?.per_file_exclusion,
    preferences?.format,
  ]);

  // Load documentation plan
  const loadDocumentationPlan = async () => {
    if (!projectId || !token) return;
    setPlanLoading(true);
    try {
      const plan = await getDocumentationPlan(projectId, token);
      setDocumentationPlan(plan);
      console.log("Documentation plan loaded:", plan); // Debug log
    } catch (error) {
      console.error("Failed to load documentation plan:", error);
      setDocumentationPlan(null);
    } finally {
      setPlanLoading(false);
    }
  };

  // Build quick lookup map for exclusions (skip blank filenames)
  const perFileMap = {};
  (perFileExclusion || [])
    .filter((e) => e?.filename)
    .forEach((e) => {
      const key = normalizePath(e.filename);
      if (!key) return;
      perFileMap[key] = {
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

  // Render documentation plan summary
  const renderPlanSummary = () => {
    if (planLoading) {
      return (
        <StatsCard
          title="📋 Documentation Plan"
          value="Loading..."
          variant="blue"
          className="mb-6"
        />
      );
    }

    if (!documentationPlan) {
      return (
        <StatsCard
          title="⚠️ Documentation Plan"
          value="Could not load"
          variant="yellow"
          className="mb-6"
        />
      );
    }

    return (
      <Card className="mb-6">
        <Card.Header>
          <Card.Title className="text-blue-800">
            📋 Documentation Plan
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-sm space-y-1">
            <p>
              <strong>Format:</strong> {documentationPlan.format}
            </p>
            <p>
              <strong>Total Items:</strong> {documentationPlan.total_items}
            </p>
            <p>
              <strong>Included Files:</strong>{" "}
              {documentationPlan.included_files?.length || 0}
            </p>
            <p>
              <strong>Excluded Files:</strong>{" "}
              {documentationPlan.excluded_files?.length || 0}
            </p>
          </div>
        </Card.Content>
      </Card>
    );
  };

  // Render file tree
  const renderFileTree = (node, depth = 0, parentPath = "") => {
    if (!node) return null;
    const path = getNodePath(node, parentPath);
    const isDir =
      node.type === "directory" ||
      node.type === "folder" ||
      Array.isArray(node.children);

    const included = isFileIncluded(node.name, path);
    const style = { paddingLeft: `${depth * 18}px` };

    if (isDir) {
      const kids =
        node.children?.map((child) => renderFileTree(child, depth + 1, path)) ||
        [];
      return (
        <div key={path} className="w-full">
          <div style={style} className="flex items-center gap-2 py-1">
            <span className={included ? "text-blue-700" : "text-gray-400"}>
              {included ? "📂" : "📁"}
            </span>
            <span
              className={`select-none truncate ${
                included ? "" : "line-through text-gray-400"
              }`}
              title={path}
            >
              {node.name}
            </span>
          </div>
          {kids}
        </div>
      );
    }

    return (
      <div
        key={node.id || path}
        style={style}
        className="flex items-center gap-2 py-1"
      >
        <span className={included ? "text-blue-700" : "text-gray-400"}>📄</span>
        <span
          className={`truncate select-none ${
            included ? "" : "line-through text-gray-400"
          }`}
          title={path}
        >
          {node.name}
        </span>
      </div>
    );
  };

  // Prepare files with inclusion status
  const filesWithStatus = (allFilesData || []).map((file) => {
    const path = normalizePath(
      file.path || file.filename || file.file_name || file.name || ""
    );
    const displayName =
      file.name || file.filename || file.file_name || basename(path);
    const included = isFileIncluded(
      displayName,
      path || file.path || displayName
    );
    return { ...file, included, path, displayName };
  });

  // Finalize: persist format + log full context
  const handleFinalize = async () => {
    console.log("Before finalize - current preferences:", preferences);
    console.log("Chosen format (local state):", docFormat);
    const ok = await completeStep(2, { format: docFormat });
    console.log(
      "After finalize attempt (context may update async):",
      preferences
    );
    if (ok) {
      showSuccess("Preferences saved to backend.");
      // Redirect to generate page to review items and trigger model
      navigate(`/projects/${projectId}/documentation/generate`);
    } else {
      showError("Failed to save project preferences. Please try again.");
    }
  };

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 justify-center">
      {/* File Tree */}
      <Card className="w-[350px] max-h-[70vh] overflow-auto flex flex-col">
        <Card.Header>
          <Card.Title>Files Overview</Card.Title>
        </Card.Header>
        <Card.Content className="overflow-auto">
          {fileTree ? (
            <div className="overflow-auto">{renderFileTree(fileTree)}</div>
          ) : (
            <div className="text-gray-500">No files found.</div>
          )}
        </Card.Content>
      </Card>

      {/* Functions & Classes */}
      <Card className="flex-1 max-h-[70vh] overflow-auto flex flex-col">
        <Card.Header>
          <Card.Title>Functions & Classes</Card.Title>
        </Card.Header>
        <Card.Content className="overflow-auto">
          <div className="flex flex-col gap-4">
            {filesWithStatus
              .filter((file) => file.included)
              .map((file) => {
                const excluded = perFileMap[file.path] || {
                  exclude_functions: [],
                  exclude_classes: [],
                  exclude_methods: [],
                };
                return (
                  <div
                    key={file.id || file.path || file.displayName}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-blue-700 break-all">
                        {file.displayName}
                      </span>
                      <span className="text-xs font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 break-all">
                        {file.path || file.displayName}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="font-semibold">Functions:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(file.functions || []).map((fn) => {
                          const isExcluded =
                            excluded.exclude_functions.includes(fn.name);
                          return (
                            <span
                              key={fn.name}
                              className={`px-2 py-1 rounded border text-xs font-mono ${
                                isExcluded
                                  ? "bg-gray-100 border-gray-300 text-gray-400 line-through"
                                  : "bg-green-50 border-green-300 text-green-800"
                              }`}
                            >
                              {fn.name}
                            </span>
                          );
                        })}
                        {(!file.functions || file.functions.length === 0) && (
                          <span className="text-gray-400 text-xs">
                            No functions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <span className="font-semibold">Classes:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(file.classes || []).map((cls) => {
                          const isExcluded = excluded.exclude_classes.includes(
                            cls.name
                          );
                          return (
                            <span
                              key={cls.name}
                              className={`px-2 py-1 rounded border text-xs font-mono ${
                                isExcluded
                                  ? "bg-gray-100 border-gray-300 text-gray-400 line-through"
                                  : "bg-green-50 border-green-300 text-green-800"
                              }`}
                            >
                              {cls.name}
                            </span>
                          );
                        })}
                        {(!file.classes || file.classes.length === 0) && (
                          <span className="text-gray-400 text-xs">
                            No classes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Methods Section */}
                    <div>
                      <span className="font-semibold">Methods:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(file.classes || []).flatMap((cls) =>
                          (cls.methods || []).map((method) => {
                            const isClassExcluded =
                              excluded.exclude_classes.includes(cls.name);
                            const isMethodExcluded =
                              excluded.exclude_methods.includes(method.name);
                            const isExcluded =
                              isClassExcluded || isMethodExcluded;

                            return (
                              <span
                                key={`${cls.name}.${method.name}`}
                                className={`px-2 py-1 rounded border text-xs font-mono ${
                                  isExcluded
                                    ? "bg-gray-100 border-gray-300 text-gray-400 line-through"
                                    : "bg-purple-50 border-purple-300 text-purple-800"
                                }`}
                                title={`${cls.name}.${method.name}`}
                              >
                                {cls.name}.{method.name}
                              </span>
                            );
                          })
                        )}
                        {(file.classes || []).every(
                          (cls) => !cls.methods || cls.methods.length === 0
                        ) && (
                          <span className="text-gray-400 text-xs">
                            No methods
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card.Content>
      </Card>

      {/* Format + Actions */}
      <Card className="w-[300px] flex flex-col">
        <Card.Header>
          <Card.Title>Documentation Settings</Card.Title>
        </Card.Header>
        <Card.Content>
          {/* Documentation Plan Summary */}
          {renderPlanSummary()}
          <h4 className="text-md font-semibold mb-3">Format Selection</h4>
          <div className="flex flex-col gap-4 mb-8">
            {["HTML", "PDF", "Markdown"].map((fmt) => (
              <label
                key={fmt}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="docFormat"
                  value={fmt}
                  checked={docFormat === fmt}
                  onChange={() => setDocFormat(fmt)}
                />
                <span>{fmt}</span>
              </label>
            ))}
          </div>
        </Card.Content>
        <Card.Footer className="flex flex-col gap-2">
          <Button variant="primary" onClick={handleFinalize}>
            Finalize & Save
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
          >
            Back to Overview
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default FinalizePreference;

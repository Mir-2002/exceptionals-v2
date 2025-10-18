import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  FaPython,
  FaPlay,
  FaDownload,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaCode,
} from "react-icons/fa";
import { getProjectFiles } from "../../services/fileService";
import { processProjectFiles } from "../../services/preferencesService";
import {
  generateProjectDocstrings,
  saveDocumentationRevision,
  getDocumentationRevisions,
  formatDocumentationContent,
  downloadDocumentationFile,
  formatDownloadFilename,
} from "../../services/documentationService";
import MonacoEditor from "@monaco-editor/react";
import { useToast } from "../../contexts/ToastContext";

const Documentation = () => {
  const { projectId } = useParams();
  const { showSuccess, showError } = useToast();
  const [files, setFiles] = useState([]);
  const [processedSummary, setProcessedSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentationResult, setDocumentationResult] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState("markdown");
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [activeTab, setActiveTab] = useState("process");

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Load files
      const filesRes = await getProjectFiles(projectId, token);
      setFiles(filesRes.data || []);

      // Load documentation revisions
      try {
        const revisionsRes = await getDocumentationRevisions(projectId, token);
        setRevisions(revisionsRes.data.revisions || []);
      } catch (error) {
        console.log("No revisions found:", error);
        setRevisions([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFiles = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const result = await processProjectFiles(projectId, token);
      setProcessedSummary(result.data);

      // Reload files to get updated processed data
      const filesRes = await getProjectFiles(projectId, token);
      setFiles(filesRes.data || []);

      showSuccess("Files processed successfully!");
    } catch (error) {
      console.error("Error processing files:", error);
      showError("Failed to process files. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateDocumentation = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const result = await generateProjectDocstrings(projectId, token);
      setDocumentationResult(result.data);

      showSuccess("Documentation generated successfully!");
    } catch (error) {
      console.error("Error generating documentation:", error);
      showError("Failed to generate documentation. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRevision = async (notes = "") => {
    if (!documentationResult || !documentationResult.documented) return;

    try {
      const token = localStorage.getItem("token");
      const content = formatDocumentationContent(
        documentationResult.documented,
        selectedFormat
      );

      await saveDocumentationRevision(
        projectId,
        selectedFormat,
        content,
        documentationResult.documented,
        token,
        notes
      );

      // Reload revisions
      const revisionsRes = await getDocumentationRevisions(projectId, token);
      setRevisions(revisionsRes.data.revisions || []);

      showSuccess("Documentation saved successfully!");
    } catch (error) {
      console.error("Error saving documentation:", error);
      showError("Failed to save documentation. Please try again.");
    }
  };

  const handleDownloadDocumentation = () => {
    if (!documentationResult || !documentationResult.documented) return;

    const content = formatDocumentationContent(
      documentationResult.documented,
      selectedFormat
    );
    const filename = formatDownloadFilename(
      `project_${projectId}`,
      selectedFormat
    );
    downloadDocumentationFile(content, filename, selectedFormat);
  };

  const toggleFileExpansion = (filename) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const getProcessedItemsCount = () => {
    if (!files.length) return { functions: 0, classes: 0, methods: 0 };

    let functions = 0;
    let classes = 0;
    let methods = 0;

    files.forEach((file) => {
      functions += file.processed_functions?.length || 0;
      classes += file.processed_classes?.length || 0;
      file.processed_classes?.forEach((cls) => {
        methods += cls.methods?.length || 0;
      });
    });

    return { functions, classes, methods };
  };

  const processedStats = getProcessedItemsCount();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading documentation data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Documentation Generation
        </h2>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {processedStats.functions}
            </div>
            <div className="text-sm text-blue-600">Processed Functions</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {processedStats.classes}
            </div>
            <div className="text-sm text-purple-600">Processed Classes</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {processedStats.methods}
            </div>
            <div className="text-sm text-green-600">Processed Methods</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleProcessFiles}
            disabled={processing}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <FaSpinner className="animate-spin" /> : <FaPlay />}
            {processing ? "Processing..." : "Apply Preferences & Process Files"}
          </button>

          <button
            onClick={handleGenerateDocumentation}
            disabled={
              generating ||
              processedStats.functions + processedStats.classes === 0
            }
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <FaSpinner className="animate-spin" /> : <FaCode />}
            {generating ? "Generating..." : "Generate Documentation"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("process")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "process"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Processed Files
        </button>
        <button
          onClick={() => setActiveTab("documentation")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "documentation"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Generated Documentation
        </button>
        <button
          onClick={() => setActiveTab("revisions")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "revisions"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Saved Revisions ({revisions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "process" && (
          <div className="space-y-4">
            {processedSummary && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">
                  Processing Summary
                </h3>
                <p className="text-green-700">
                  Processed {processedSummary.processed_files?.length || 0}{" "}
                  files according to your preferences.
                </p>
              </div>
            )}

            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No files found in this project.
              </div>
            ) : (
              files.map((file, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow border border-gray-200"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleFileExpansion(file.filename)}
                  >
                    <div className="flex items-center gap-3">
                      <FaPython className="text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-800">
                          {file.filename}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {file.processed_functions?.length || 0} functions,{" "}
                          {file.processed_classes?.length || 0} classes
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {expandedFiles.has(file.filename) ? "−" : "+"}
                    </div>
                  </div>

                  {expandedFiles.has(file.filename) && (
                    <div className="border-t border-gray-200 p-4 space-y-6">
                      {/* Processed Functions */}
                      {file.processed_functions &&
                        file.processed_functions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-blue-600 mb-3">
                              Processed Functions (
                              {file.processed_functions.length})
                            </h4>
                            <div className="space-y-3">
                              {file.processed_functions.map((func, fIndex) => (
                                <div
                                  key={fIndex}
                                  className="bg-blue-50 rounded-lg p-3"
                                >
                                  <h5 className="font-medium text-blue-800 mb-2">
                                    {func.name}
                                  </h5>
                                  <div className="rounded overflow-hidden border border-gray-200">
                                    <MonacoEditor
                                      height="100px"
                                      defaultLanguage="python"
                                      value={func.code}
                                      options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 12,
                                        scrollBeyondLastLine: false,
                                        wordWrap: "on",
                                        lineNumbers: "off",
                                      }}
                                      theme="vs-light"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Processed Classes */}
                      {file.processed_classes &&
                        file.processed_classes.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-purple-600 mb-3">
                              Processed Classes ({file.processed_classes.length}
                              )
                            </h4>
                            <div className="space-y-3">
                              {file.processed_classes.map((cls, cIndex) => (
                                <div
                                  key={cIndex}
                                  className="bg-purple-50 rounded-lg p-3"
                                >
                                  <h5 className="font-medium text-purple-800 mb-2">
                                    {cls.name}
                                  </h5>
                                  <div className="rounded overflow-hidden border border-gray-200 mb-3">
                                    <MonacoEditor
                                      height="100px"
                                      defaultLanguage="python"
                                      value={cls.code}
                                      options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 12,
                                        scrollBeyondLastLine: false,
                                        wordWrap: "on",
                                        lineNumbers: "off",
                                      }}
                                      theme="vs-light"
                                    />
                                  </div>

                                  {/* Methods */}
                                  {cls.methods && cls.methods.length > 0 && (
                                    <div className="ml-4">
                                      <h6 className="font-medium text-green-600 mb-2">
                                        Methods ({cls.methods.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {cls.methods.map((method, mIndex) => (
                                          <div
                                            key={mIndex}
                                            className="bg-white rounded p-2 border border-gray-200"
                                          >
                                            <h6 className="font-medium text-green-700 mb-1">
                                              {method.name}
                                            </h6>
                                            <div className="rounded overflow-hidden border border-gray-200">
                                              <MonacoEditor
                                                height="80px"
                                                defaultLanguage="python"
                                                value={method.code}
                                                options={{
                                                  readOnly: true,
                                                  minimap: { enabled: false },
                                                  fontSize: 11,
                                                  scrollBeyondLastLine: false,
                                                  wordWrap: "on",
                                                  lineNumbers: "off",
                                                }}
                                                theme="vs-light"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {!file.processed_functions?.length &&
                        !file.processed_classes?.length && (
                          <div className="text-center py-4 text-gray-500">
                            No processed items for this file.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "documentation" && (
          <div className="space-y-6">
            {!documentationResult ? (
              <div className="text-center py-8 text-gray-500">
                <FaFileAlt className="text-4xl mb-4 mx-auto" />
                <p>No documentation generated yet.</p>
                <p className="text-sm">
                  Process files and generate documentation to see results here.
                </p>
              </div>
            ) : (
              <>
                {/* Format selection and actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Generated Documentation
                    </h3>
                    <div className="flex items-center gap-4">
                      <select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="markdown">Markdown</option>
                        <option value="html">HTML</option>
                        <option value="pdf">PDF</option>
                      </select>

                      <button
                        onClick={() => handleSaveRevision()}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        <FaCheck />
                        Save Revision
                      </button>

                      <button
                        onClick={handleDownloadDocumentation}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        <FaDownload />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <FaCheck className="text-green-600" />
                        <span className="font-medium text-green-800">
                          {documentationResult.documented?.length || 0} items
                          documented
                        </span>
                      </div>
                    </div>
                    {documentationResult.failed &&
                      documentationResult.failed.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <FaTimes className="text-red-600" />
                            <span className="font-medium text-red-800">
                              {documentationResult.failed.length} items failed
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Documentation preview */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Documentation Preview
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <MonacoEditor
                      height="500px"
                      defaultLanguage={
                        selectedFormat === "html" ? "html" : "markdown"
                      }
                      value={formatDocumentationContent(
                        documentationResult.documented,
                        selectedFormat
                      )}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: "on",
                        lineNumbers: "on",
                      }}
                      theme="vs-light"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "revisions" && (
          <div className="space-y-4">
            {revisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaFileAlt className="text-4xl mb-4 mx-auto" />
                <p>No saved revisions yet.</p>
                <p className="text-sm">
                  Generate and save documentation to see revisions here.
                </p>
              </div>
            ) : (
              revisions.map((revision, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Revision {revision.revision_id.substring(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Format: {revision.format.toUpperCase()} • Created:{" "}
                        {new Date(revision.created_at).toLocaleDateString()} •
                        Items: {revision.documented?.length || 0}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const filename = formatDownloadFilename(
                          `project_${projectId}_${revision.revision_id.substring(
                            0,
                            8
                          )}`,
                          revision.format
                        );
                        downloadDocumentationFile(
                          revision.content,
                          filename,
                          revision.format
                        );
                      }}
                      className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
                    >
                      <FaDownload />
                      Download
                    </button>
                  </div>

                  {revision.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">{revision.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;

import React, { useState, useEffect } from "react";
import {
  FaFolder,
  FaPython,
  FaChevronRight,
  FaChevronDown,
  FaTrash,
  FaEye,
} from "react-icons/fa";
import { useParams } from "react-router-dom";
import { getProjectFiles, deleteFile } from "../../services/fileService";
import MonacoEditor from "@monaco-editor/react";

const Files = () => {
  const { projectId } = useParams();
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await getProjectFiles(projectId, token);
      setFiles(response.data || []);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (files) => {
    const tree = {};

    files.forEach((file) => {
      const parts = file.filename.split("/");
      let current = tree;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
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

  const handleDelete = async (item) => {
    try {
      const token = localStorage.getItem("token");
      if (item.isFile) {
        await deleteFile(projectId, item.data._id, token);
      }
      setDeleteDialog(null);
      loadFiles();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const renderTreeItem = (item, depth = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const children = Object.values(item.children);
    const isSelected =
      selectedFile &&
      item.isFile &&
      selectedFile.filename === item.data.filename;

    return (
      <div key={item.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer
          ${
            isSelected
              ? "bg-blue-50 text-primary font-semibold"
              : "hover:bg-gray-100 text-secondary"
          }
        `}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (item.isFile) setSelectedFile(item.data);
          }}
        >
          {!item.isFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(item.path);
              }}
              className="p-1"
            >
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
              <span className="flex-1 text-sm">{item.name}</span>
            </>
          ) : (
            <>
              <FaFolder className="text-yellow-400" size={16} />
              <span className="flex-1 text-sm">{item.name}</span>
            </>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDialog(item);
            }}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <FaTrash size={14} />
          </button>
        </div>

        {!item.isFile && isExpanded && (
          <div>{children.map((child) => renderTreeItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const getFilePath = (filename) => {
    const parts = filename.split("/");
    const fileName = parts.pop();
    const pathParts = parts.join("/");
    return { pathParts, fileName };
  };

  if (loading) {
    return <div className="p-4">Loading files...</div>;
  }

  const fileTree = buildFileTree(files);

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]">
        <h3 className="font-bold text-lg mb-4">Project Files</h3>
        <div className="space-y-1">
          {Object.values(fileTree).map((item) => renderTreeItem(item))}
        </div>
      </div>

      {/* File Details */}
      <div className="w-1/2 ml-4 bg-white rounded-lg shadow p-4 overflow-y-auto max-h-[80vh]">
        {selectedFile ? (
          <div>
            {/* File Header */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center mb-2">
                <FaPython className="text-blue-600 mr-2" size={20} />
                <div>
                  {getFilePath(selectedFile.filename).pathParts && (
                    <p className="text-sm text-gray-500">
                      {getFilePath(selectedFile.filename).pathParts}/
                    </p>
                  )}
                  <h3 className="text-xl font-bold text-gray-800">
                    {getFilePath(selectedFile.filename).fileName}
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Functions Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Functions ({selectedFile.functions?.length || 0})
                </h4>
                {selectedFile.functions?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedFile.functions.map((func, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-600 mb-2">
                          {func.name}
                        </h5>
                        <div className="rounded overflow-hidden border border-gray-200">
                          <MonacoEditor
                            height="150px"
                            defaultLanguage="python"
                            value={func.code}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 13,
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
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No functions found</p>
                )}
              </div>

              {/* Classes Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Classes ({selectedFile.classes?.length || 0})
                </h4>
                {selectedFile.classes?.length > 0 ? (
                  <div className="space-y-4">
                    {selectedFile.classes.map((cls, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-purple-600 mb-2">
                          {cls.name}
                        </h5>
                        <div className="rounded overflow-hidden border border-gray-200 mb-4">
                          <MonacoEditor
                            height="150px"
                            defaultLanguage="python"
                            value={cls.code}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 13,
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

                        {cls.methods && cls.methods.length > 0 && (
                          <div className="ml-4">
                            <h6 className="font-semibold text-gray-700 mb-2">
                              Methods ({cls.methods.length})
                            </h6>
                            <div className="space-y-3">
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
                                      height="120px"
                                      defaultLanguage="python"
                                      value={method.code}
                                      options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 13,
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
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No classes found</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FaPython size={48} className="mb-4" />
            <p className="text-lg">Select a file to view its details</p>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h3 className="font-bold text-lg mb-4">Delete Item</h3>
            <p className="mb-4">
              Are you sure you want to delete this item? This cannot be undone.
            </p>
            <div className="bg-blue-50 p-3 rounded mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Instead of deleting this item, you can
                choose to exclude this item in the Preferences section.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Exclude Item Instead
              </button>
              <button
                onClick={() => handleDelete(deleteDialog)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Files;

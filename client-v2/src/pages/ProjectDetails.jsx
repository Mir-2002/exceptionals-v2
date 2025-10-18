import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { getProjectById, deleteProject } from "../services/projectService";
import {
  uploadFile,
  uploadProjectZip,
  uploadProjectFiles,
  getFileTree,
  deleteFile,
  getFile,
} from "../services/fileService";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { FaTrashAlt } from "react-icons/fa";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState(null);
  const [openFolders, setOpenFolders] = useState(new Set(["root"]));
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [viewingFileName, setViewingFileName] = useState("");
  const [showFileBox, setShowFileBox] = useState(false);
  const navigate = useNavigate();

  const fetchProject = async () => {
    try {
      const data = await getProjectById(projectId, token);
      setProject(data);
    } catch (err) {
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileTree = async () => {
    try {
      const tree = await getFileTree(projectId, token);
      setFileTree(tree);
      if (tree) {
        const checkIds = (node) => {
          if (node.children) {
            node.children.forEach(checkIds);
          } else {
            if (!node.id) {
              console.warn("File node missing id:", node);
            }
          }
        };
        checkIds(tree);
      }
    } catch (err) {
      setFileTree(null);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchFileTree();
  }, [projectId, token]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
    setDeleting(true);
    try {
      await deleteProject(projectId, token);
      showSuccess("Project deleted successfully!");
      navigate("/dashboard");
    } catch (err) {
      showError("Failed to delete project. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      if (
        files.length === 1 &&
        (files[0].type === "application/zip" ||
          files[0].name.toLowerCase().endsWith(".zip"))
      ) {
        await uploadProjectZip(projectId, files[0], token);
      } else if (files.length === 1) {
        await uploadFile(projectId, files[0], token);
      } else {
        await uploadProjectFiles(projectId, files, token);
      }
      showSuccess("Files uploaded successfully!");
      setFiles([]);
      fetchProject();
      fetchFileTree();
    } catch (err) {
      showError("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getNodePath = (node, parentPath = "") => {
    return parentPath ? `${parentPath}/${node.name}` : node.name;
  };

  const collectFileIds = (node) => {
    let ids = [];
    if (node.children) {
      node.children.forEach((child) => {
        ids = ids.concat(collectFileIds(child));
      });
    } else if (node.id) {
      ids.push(node.id);
    }
    return ids;
  };

  const handleDeleteNode = async (node, parentPath = "") => {
    if (node.children) {
      const fileIds = collectFileIds(node);
      if (fileIds.length === 0) {
        showWarning("This folder does not contain any files to delete.");
        return;
      }
      if (
        !window.confirm(
          `Delete folder "${node.name}" and ALL ${fileIds.length} files inside? This cannot be undone.`
        )
      )
        return;
      try {
        await Promise.all(
          fileIds.map((fileId) => deleteFile(projectId, fileId, token))
        );
        fetchFileTree();
        setSelectedFile(null);
        setFileContent("");
        setViewingFileName("");
        setShowFileBox(false);
        showSuccess(
          `Folder "${node.name}" and all its files deleted successfully!`
        );
      } catch (err) {
        showError("Failed to delete folder and its files.");
      }
    } else {
      if (!node.id) {
        showError("Cannot delete: file node missing id.");
        return;
      }
      if (!window.confirm(`Delete file "${node.name}"? This cannot be undone.`))
        return;
      try {
        await deleteFile(projectId, node.id, token);
        fetchFileTree();
        setSelectedFile(null);
        setFileContent("");
        setViewingFileName("");
        setShowFileBox(false);
        showSuccess(`File "${node.name}" deleted successfully!`);
      } catch (err) {
        showError("Failed to delete file.");
      }
    }
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

  const handleViewFile = async (node) => {
    if (!node.id) return;
    try {
      const data = await getFile(projectId, node.id, token);
      setSelectedFile(node.id);
      setViewingFileName(node.name);
      let code = "";
      if (data.functions && data.functions.length > 0) {
        code += data.functions.map((f) => f.code).join("\n\n");
      }
      if (data.classes && data.classes.length > 0) {
        code += "\n\n" + data.classes.map((c) => c.code).join("\n\n");
      }
      if (!code) {
        code = "// No code found in functions or classes.";
      }
      setFileContent(code);
      setShowFileBox(true);
    } catch (err) {
      showError("Failed to fetch file content.");
    }
  };

  // Updated renderFileTree for vertical spacing and centered FaTrashAlt icon only
  const renderFileTree = (node, depth = 0, parentPath = "") => {
    const path = getNodePath(node, parentPath);
    const isFolder = !!node.children;
    const isOpen = openFolders.has(path);
    const isRoot = path === "root";

    // Use Tailwind for left padding and spacing
    const paddingClass = `pl-[${depth * 1.25}rem]`; // 1.25rem per depth
    const itemClass = `flex items-center flex-wrap overflow-hidden w-full mb-1`; // mb-1 for less gap

    if (isFolder) {
      return (
        <div key={path} className="w-full">
          <div
            className={`${itemClass} ${paddingClass}`}
            style={{ paddingLeft: `${depth * 20}px` }} // fallback for dynamic padding
          >
            <button
              className="mr-2 text-blue-700 font-semibold focus:outline-none flex-shrink-0 bg-transparent border-0 cursor-pointer"
              onClick={() => handleToggleFolder(path)}
            >
              {isOpen ? "📂" : "📁"}
            </button>
            <span
              className="cursor-pointer font-semibold text-blue-700 flex-grow min-w-0 truncate"
              onClick={() => handleToggleFolder(path)}
            >
              {node.name}
            </span>
            {!isRoot && (
              <button
                type="button"
                className="ml-2 flex items-center justify-center px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex-shrink-0"
                onClick={() => handleDeleteNode(node, parentPath)}
                aria-label="Delete"
              >
                <FaTrashAlt className="mx-auto" />
              </button>
            )}
          </div>
          {isOpen &&
            node.children.map((child) =>
              renderFileTree(child, depth + 1, path)
            )}
        </div>
      );
    }
    return (
      <div
        key={node.id || path}
        className={`${itemClass} ${paddingClass}`}
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        <span
          className={`text-gray-800 cursor-pointer flex-grow min-w-0 truncate ${
            selectedFile === node.id ? "font-bold underline" : ""
          }`}
          onClick={() => handleViewFile(node)}
        >
          📄 {node.name}
        </span>
        <button
          type="button"
          className="ml-2 flex items-center justify-center px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex-shrink-0"
          onClick={() => handleDeleteNode(node, parentPath)}
          aria-label="Delete"
        >
          <FaTrashAlt className="mx-auto" />
        </button>
      </div>
    );
  };

  if (loading) return <div className="p-10">Loading project...</div>;
  if (!project)
    return <div className="p-10 text-red-500">Project not found.</div>;

  return (
    <div className="flex flex-row gap-8 w-full max-w-none mx-auto mt-10 px-4 overflow-x-hidden justify-center">
      {/* Main Project Box */}
      <div className="w-[500px] p-6 border rounded-lg shadow bg-white">
        {/* Project Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2 break-words">
            {project.name}
          </h2>
          <div className="mb-2">
            <span className="font-semibold">Description:</span>
            <span className="ml-2 text-gray-700 break-words">
              {project.description}
            </span>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Status:</span>
            {project.status.toLowerCase() === "empty" || !project.status ? (
              <span className="ml-2 px-2 py-1 rounded bg-gray-200 text-gray-700 font-semibold">
                EMPTY
              </span>
            ) : project.status.toLowerCase() === "in_progress" ? (
              <span className="ml-2 px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">
                IN PROGRESS
              </span>
            ) : project.status.toLowerCase() === "completed" ? (
              <span className="ml-2 px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">
                COMPLETED
              </span>
            ) : (
              <span className="ml-2 px-2 py-1 rounded bg-gray-200 text-gray-700 font-semibold">
                {project.status}
              </span>
            )}
          </div>
          {/* Display tags, always show "Tags:" */}
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <span className="font-semibold">Tags:</span>
            {project.tags && project.tags.length > 0 ? (
              project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-gray-500 ml-2">None</span>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <label className="block mb-2 font-medium">
            Upload Files (.py or .zip)
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
          />
          {files.length > 0 && (
            <ul className="mt-2">
              {files.map((file, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between mb-3 gap-2"
                >
                  <span className="truncate flex-grow min-w-0 break-all">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex-shrink-0"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
        </div>

        {/* File Tree */}
        <div
          className="bg-gray-50 p-4 rounded border flex flex-col overflow-hidden"
          style={{ height: "40vh" }}
        >
          <h3 className="text-lg font-bold mb-2 flex-shrink-0">
            Uploaded Files
          </h3>
          <div className="overflow-auto w-full flex-1 rounded">
            {fileTree ? (
              renderFileTree(fileTree)
            ) : (
              <div className="text-gray-500">No files uploaded yet.</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-6">
          {/* Left side: Back & Start Documentation */}
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              onClick={() => navigate("/dashboard")}
            >
              Back
            </button>
            <button
              className={`px-4 py-2 rounded text-white ${
                fileTree && fileTree.children && fileTree.children.length > 0
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              onClick={() =>
                fileTree && fileTree.children && fileTree.children.length > 0
                  ? navigate(`/projects/${projectId}/preferences`)
                  : undefined
              }
              disabled={
                !(fileTree && fileTree.children && fileTree.children.length > 0)
              }
            >
              Start Documentation
            </button>
          </div>
          {/* Right side: Delete Project */}
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </button>
        </div>
      </div>

      {/* File Content Box */}
      {showFileBox && (
        <div className="w-[500px] bg-gray-50 p-6 rounded border shadow">
          <h3 className="text-lg font-bold mb-4 break-words">
            {viewingFileName ? `Viewing: ${viewingFileName}` : "File Contents"}
          </h3>
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

export default ProjectDetails;

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { getProjectById, deleteProject } from "../services/projectService";
import {
  uploadFile,
  uploadProjectZip,
  uploadProjectFiles,
  getFileTree,
} from "../services/fileService";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState(null);
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
    } catch (err) {
      setFileTree(null);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchFileTree();
    // eslint-disable-next-line
  }, [projectId, token]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
    setDeleting(true);
    try {
      await deleteProject(projectId, token);
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to delete project.");
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
      alert("Files uploaded successfully!");
      setFiles([]);
      fetchProject();
      fetchFileTree(); // Refresh file tree after upload
    } catch (err) {
      alert("Failed to upload files.");
    } finally {
      setUploading(false);
    }
  };

  // Recursive function to render file tree (folders and files only)
  const renderFileTree = (node, depth = 0) => {
    if (!node) return null;
    if (node.children) {
      // Directory
      return (
        <div key={node.name} style={{ marginLeft: depth * 16 }}>
          <span className="font-semibold text-blue-700">📁 {node.name}</span>
          {node.children.map((child) => renderFileTree(child, depth + 1))}
        </div>
      );
    }
    // File node
    return (
      <div key={node.name} style={{ marginLeft: depth * 16 }}>
        <span className="text-gray-800">📄 {node.name}</span>
      </div>
    );
  };

  if (loading) return <div className="p-10">Loading project...</div>;
  if (!project)
    return <div className="p-10 text-red-500">Project not found.</div>;

  return (
    <div className="max-w-xl mx-auto p-10 border rounded-lg shadow bg-white mt-10">
      <h2 className="text-2xl font-bold mb-4">{project.name}</h2>
      <div className="mb-2">
        <span className="font-semibold">Description:</span>
        <span className="ml-2 text-gray-700">{project.description}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Project ID:</span>
        <span className="ml-2 text-gray-700">{project.id}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Owner User ID:</span>
        <span className="ml-2 text-gray-700">{project.user_id}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Status:</span>
        <span className="ml-2 text-gray-700">{project.status}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Created At:</span>
        <span className="ml-2 text-gray-700">{project.created_at}</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Updated At:</span>
        <span className="ml-2 text-gray-700">{project.updated_at}</span>
      </div>
      <div className="mt-6">
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
              <li key={idx} className="flex items-center justify-between mb-1">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
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
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-2">Uploaded Files</h3>
        {fileTree ? (
          <div className="bg-gray-50 p-4 rounded border">
            {renderFileTree(fileTree)}
          </div>
        ) : (
          <div className="text-gray-500">No files uploaded yet.</div>
        )}
      </div>
      <div className="flex gap-2 mt-6">
        <button
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
      </div>
    </div>
  );
};

export default ProjectDetails;

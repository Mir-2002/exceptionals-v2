import React, { useState } from "react";
import Form from "./Form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { createProject } from "../services/projectService";
import {
  uploadProjectFiles,
  uploadProjectZip,
  uploadFile,
} from "../services/fileService";

const CreateProject = () => {
  const [files, setFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const fields = [
    {
      name: "name",
      label: "Project Title",
      type: "text",
      required: true,
      placeholder: "Enter project title",
    },
    {
      name: "description",
      label: "Project Description",
      type: "textarea",
      required: true,
      placeholder: "Enter project description",
    },
  ];

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    // Separate zip file from other files
    const zip = selectedFiles.find((file) => file.name.endsWith(".zip"));
    setZipFile(zip || null);
    setFiles(selectedFiles.filter((file) => !file.name.endsWith(".zip")));
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveZip = () => {
    setZipFile(null);
  };

  const handleSubmit = async (values) => {
    try {
      // Step 1: Create project
      const project = await createProject(
        { name: values.name, description: values.description },
        token
      );

      // Step 2: Upload files (single, multiple, or zip)
      setUploading(true);
      if (zipFile) {
        await uploadProjectZip(project.id, zipFile, token);
      }
      if (files.length === 1) {
        await uploadFile(project.id, files[0], token);
      } else if (files.length > 1) {
        await uploadProjectFiles(project.id, files, token);
      }
      setUploading(false);

      navigate("/dashboard");
    } catch (error) {
      setUploading(false);
      console.error(error.message);
      alert("Failed to create project or upload files.");
    }
  };

  return (
    <main className="flex items-center justify-center h-full">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
        <Form
          fields={fields}
          initialValues={{ name: "", description: "" }}
          onSubmit={handleSubmit}
          buttonText={uploading ? "Uploading..." : "Create Project"}
          disabled={uploading}
        />
        <div className="mt-4">
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
            disabled={uploading}
            accept=".py,.zip"
          />
          {/* Show zip file if selected */}
          {zipFile && (
            <div className="mt-2 flex items-center justify-between bg-yellow-50 p-2 rounded">
              <span className="truncate">{zipFile.name}</span>
              <button
                type="button"
                className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleRemoveZip}
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          )}
          {/* Show other files if selected */}
          {files.length > 0 && (
            <ul className="mt-2">
              {files.map((file, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between mb-1"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={uploading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* Note about uploading files later */}
          <div className="mt-4 p-3 rounded bg-yellow-100 text-yellow-800 text-sm font-normal">
            <span className="font-bold">NOTE: </span> You can choose to upload
            files later on.
          </div>
        </div>
        <button
          className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full"
          type="button"
          onClick={() => navigate("/dashboard")}
          disabled={uploading}
        >
          Cancel
        </button>
      </div>
    </main>
  );
};

export default CreateProject;

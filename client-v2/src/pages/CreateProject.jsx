import React, { useState } from "react";
import Form from "../components/Form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { createProject } from "../services/projectService";
import {
  uploadProjectFiles,
  uploadProjectZip,
  uploadFile,
} from "../services/fileService";
import { Button, Card } from "../components/ui";
import { showSuccess, showError } from "../utils/toast";

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
      showSuccess("Project created successfully!");

      navigate("/dashboard");
    } catch (error) {
      setUploading(false);
      console.error(error.message);
      showError("Failed to create project or upload files. Please try again.");
    }
  };

  return (
    <main className="flex items-center justify-center h-full">
      {" "}
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Create New Project</Card.Title>
        </Card.Header>
        <Card.Content>
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
                <span className="truncate">{zipFile.name}</span>{" "}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemoveZip}
                  disabled={uploading}
                >
                  Remove
                </Button>
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
                    <span className="truncate">{file.name}</span>{" "}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={uploading}
                    >
                      Remove
                    </Button>
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
        </Card.Content>
        <Card.Footer>
          <Button
            variant="secondary"
            onClick={() => navigate("/dashboard")}
            disabled={uploading}
            className="w-full"
          >
            Cancel
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
};

export default CreateProject;

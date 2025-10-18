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

const TAG_OPTIONS = ["Library", "Framework", "API"];

const CreateProject = () => {
  const [files, setFiles] = useState([]);
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
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

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCustomTagAdd = () => {
    const tag = customTag.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
      setCustomTag("");
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Step 1: Create project
      const project = await createProject(
        {
          name: values.name,
          description: values.description,
          tags: selectedTags,
        },
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
          {/* Tag selection */}
          <div className="mt-4">
            <label className="block mb-2 font-medium">Project Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`px-3 py-1 rounded border ${
                    selectedTags.includes(tag)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                  onClick={() => handleTagToggle(tag)}
                  disabled={uploading}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag"
                className="px-2 py-1 border rounded w-full"
                disabled={uploading}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleCustomTagAdd}
                disabled={uploading || !customTag.trim()}
              >
                Add
              </Button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      className="ml-2 text-xs text-red-500 hover:underline"
                      onClick={() => handleTagToggle(tag)}
                      disabled={uploading}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* File upload section */}
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

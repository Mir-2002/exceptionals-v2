import React, { useState } from "react";
import Form from "./Form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { createProject } from "../services/projectService";

const CreateProject = () => {
  const [files, setFiles] = useState([]);
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
    setFiles(Array.from(e.target.files));
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values) => {
    try {
      await createProject(
        { name: values.name, description: values.description },
        token
      );
      navigate("/dashboard");
    } catch (error) {
      // Optionally handle error (e.g., show a message)
      console.error(error.message);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
        <Form
          fields={fields}
          initialValues={{ name: "", description: "" }}
          onSubmit={handleSubmit}
          buttonText="Create Project"
        />
        <div className="mt-4">
          <label className="block mb-2 font-medium">Upload Files</label>
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
                  className="flex items-center justify-between mb-1"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleRemoveFile(idx)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Cancel
        </button>
      </div>
    </main>
  );
};

export default CreateProject;

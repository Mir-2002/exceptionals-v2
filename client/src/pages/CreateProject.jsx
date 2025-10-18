import React, { useEffect, useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Container from "../components/Container";
import { createProject } from "../services/projectService";
import { uploadFile, uploadProjectZip } from "../services/fileService";
import { useNavigate } from "react-router-dom";
import { getToken, getCurrentUser } from "../services/authService";
import Heading from "../components/Heading";

const CreateProject = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      const u = await getCurrentUser();
      setUser(u);
    }
    fetchUser();
  }, []);

  const token = getToken();

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!user?.id) {
      setError("User not loaded. Please log in again.");
      setLoading(false);
      return;
    }
    try {
      // 1. Create the project
      const res = await createProject(
        { name, description, user_id: user.id },
        token
      );
      const projectId = res.data.id;

      // 2. Upload files using fileService
      if (files.length > 0) {
        // If the user selected a single zip file, upload as zip
        if (
          (files.length === 1 && files[0].type === "application/zip") ||
          files[0].name.toLowerCase().endsWith(".zip")
        ) {
          await uploadProjectZip(projectId, files[0], token);
        } else {
          // Otherwise, upload each file individually
          for (const file of files) {
            await uploadFile(projectId, file, token);
          }
        }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to create project or upload files. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="flex-row w-full items-start h-screen">
      <Sidebar />
      <main className="flex flex-col items-center justify-center w-full h-full p-10 gap-y-5">
        <Heading>Create Project</Heading>
        <form
          className="flex flex-col gap-y-5 w-full max-w-lg bg-white p-8 rounded-lg shadow-md"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-y-2">
            <label htmlFor="name" className="font-medium text-lg">
              Project Name
            </label>
            <input
              id="name"
              type="text"
              className="border border-gray-300 rounded-md p-3 text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter project name"
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <label htmlFor="description" className="font-medium text-lg">
              Description
            </label>
            <textarea
              id="description"
              className="border border-gray-300 rounded-md p-3 text-lg resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Enter project description"
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <label htmlFor="files" className="font-medium text-lg">
              Upload Files or Zip
            </label>
            <input
              id="files"
              type="file"
              multiple
              onChange={handleFileChange}
              className="border border-gray-300 rounded-md p-3 text-lg"
            />
          </div>
          {error && (
            <div className="text-red-500 font-medium text-center">
              {typeof error === "string"
                ? error
                : Array.isArray(error)
                ? error.map((e, i) => (
                    <div key={i}>{e.msg || JSON.stringify(e)}</div>
                  ))
                : error.msg || JSON.stringify(error)}
            </div>
          )}
          <button
            type="submit"
            className="bg-primary text-white font-semibold px-6 py-3 rounded-md hover:bg-primary/90 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
          <button
            className="text-lg text-secondary hover:bg-gray-200 hover:text-primary w-full p-2 rounded-md "
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </form>
      </main>
    </Container>
  );
};

export default CreateProject;

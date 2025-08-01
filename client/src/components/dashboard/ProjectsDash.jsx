import React, { useState } from "react";
import Heading from "../Heading";
import { FaEye } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import { AiFillTool } from "react-icons/ai";
import { deleteProject } from "../../services/projectService";
import { getToken } from "../../services/authService";
import { useNavigate } from "react-router-dom";

// Map backend status to color keys
const statusColorMap = {
  complete: "green",
  in_progress: "yellow",
  empty: "red",
};

function ProjectInfoCards({ number, description, color, className }) {
  const colorMap = {
    green: {
      bg: "bg-green-200",
      text: "text-green-700",
      desc: "text-green-600",
    },
    yellow: {
      bg: "bg-yellow-200",
      text: "text-yellow-700",
      desc: "text-yellow-600",
    },
    red: {
      bg: "bg-red-200",
      text: "text-red-700",
      desc: "text-red-600",
    },
  };
  const colors = colorMap[color] || colorMap.green;
  return (
    <div
      className={`flex flex-col items-center w-1/3 ${colors.bg} p-5 ${className}`}
    >
      <h1 className={`text-xl text-start w-full font-bold ${colors.text}`}>
        {number}
      </h1>
      <p className={`text-base ${colors.desc} text-start w-full`}>
        {description}
      </p>
    </div>
  );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, projectName }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Project</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{projectName}"? This action will
          permanently delete the project and all associated files. This cannot
          be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onProjectDeleted }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const token = getToken();
  const navigate = useNavigate();

  const color = statusColorMap[project.status] || "gray";
  const colorMap = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    gray: "text-gray-500",
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(project.id, token);
      setShowDeleteModal(false);
      // Call the callback to refresh the projects list
      onProjectDeleted(project.id);
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  function formatStatus(status) {
    if (!status) return "N/A";
    // Replaces underscores with spaces and capitalizes each word
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return (
    <>
      <div className="flex flex-row w-full h-1/5 border-2 border-gray-200 rounded-lg shadow-md">
        {/* Set a fixed width and hide overflow on this container */}
        <div className="flex flex-col w-1/3 justify-center p-5 overflow-hidden">
          {/* Apply truncate directly to the text elements */}
          <h1 className="text-lg font-medium truncate" title={project.name}>
            {project.name}
          </h1>
          <p
            className="text-base text-secondary truncate"
            title={project.description}
          >
            {project.description}
          </p>
        </div>
        <div className="flex flex-col w-1/3 justify-center p-5">
          <h1 className="text-lg font-medium">
            Status:{" "}
            <span className={`font-medium ${colorMap[color]}`}>
              {formatStatus(project.status)}
            </span>
          </h1>
          <p className="text-base text-secondary">
            Last Updated:{" "}
            {project.updated_at
              ? new Date(project.updated_at).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
        <div className="flex flex-row w-1/3 justify-end items-center gap-x-3 p-5">
          <button
            className="bg-primary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-primary/90 flex items-center gap-x-2"
            onClick={() => navigate(`/dashboard/projects/${project.id}`)}
          >
            <FaEye className="text-base" />
            View
          </button>
          <button
            className="bg-secondary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-secondary/90 flex items-center gap-x-2"
            onClick={() => navigate(`/dashboard/projects/${project.id}/manage`)}
          >
            <AiFillTool className="text-base" />
            Manage
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-red-600 flex items-center gap-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTrashAlt className="text-base" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        projectName={project.name}
      />
    </>
  );
}

function ProjectsDash({ projects = [], onProjectsChange }) {
  // Count projects by status
  const completeCount = projects.filter((p) => p.status === "complete").length;
  const inProgressCount = projects.filter(
    (p) => p.status === "in_progress"
  ).length;
  const emptyCount = projects.filter((p) => p.status === "empty").length;

  const handleProjectDeleted = (deletedProjectId) => {
    const updatedProjects = projects.filter(
      (project) => project.id !== deletedProjectId
    );
    onProjectsChange(updatedProjects);
  };

  return (
    <section className="flex flex-col w-2/3 h-full p-10 border-r-2 border-gray-200 gap-y-5">
      <Heading className="text-start">Projects</Heading>
      <div className="flex flex-row w-full items-center justify-around h-20 flex-shrink-0">
        <ProjectInfoCards
          number={completeCount}
          description="Complete"
          color="green"
          className="rounded-l-lg"
        />
        <ProjectInfoCards
          number={inProgressCount}
          description="In Progress"
          color="yellow"
        />
        <ProjectInfoCards
          number={emptyCount}
          description="Empty/No Files"
          color="red"
          className="rounded-r-lg"
        />
      </div>
      <div className="flex flex-col w-full flex-1 items-center gap-y-3 overflow-y-auto min-h-0">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 italic">No projects found.</div>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProjectDeleted={handleProjectDeleted}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default ProjectsDash;

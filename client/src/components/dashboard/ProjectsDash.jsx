import React from "react";
import Heading from "../Heading";
import { FaEye } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import { AiFillTool } from "react-icons/ai";

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

function ProjectCard({ project }) {
  const color = statusColorMap[project.status] || "gray";
  const colorMap = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    gray: "text-gray-500",
  };
  return (
    <div className="flex flex-row w-full h-1/5 border-2 border-gray-200 rounded-lg shadow-md ">
      <div className="flex flex-col w-1/3 justify-center p-5">
        <h1 className="text-lg font-medium">{project.name}</h1>
        <p className="text-base text-secondary">{project.description}</p>
      </div>
      <div className="flex flex-col w-1/3 justify-center p-5">
        <h1 className="text-lg font-medium">
          Status:{" "}
          <span className={`font-medium ${colorMap[color]}`}>
            {project.status?.toUpperCase()}
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
        <button className="bg-primary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-primary/90 flex items-center gap-x-2">
          <FaEye className="text-base" />
          View
        </button>
        <button className="bg-secondary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-secondary/90 flex items-center gap-x-2">
          <AiFillTool className="text-base" />
          Manage
        </button>
        <button className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-red-600 flex items-center gap-x-2">
          <FaTrashAlt className="text-base" />
          Delete
        </button>
      </div>
    </div>
  );
}

function ProjectsDash({ projects = [] }) {
  // Count projects by status
  const completeCount = projects.filter((p) => p.status === "complete").length;
  const inProgressCount = projects.filter(
    (p) => p.status === "in_progress"
  ).length;
  const emptyCount = projects.filter((p) => p.status === "empty").length;

  return (
    <section className="flex flex-col w-2/3 h-full p-10 border-r-2 border-gray-200 gap-y-5">
      <Heading className="text-start">Projects</Heading>
      <div className="flex flex-row w-full items-center justify-around h-20">
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
      <div className="flex flex-col w-full h-full items-center justify-center gap-y-3">
        {projects.length === 0 ? (
          <div className="text-gray-400 italic mt-10">No projects found.</div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </section>
  );
}

export default ProjectsDash;

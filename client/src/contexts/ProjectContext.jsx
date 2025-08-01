// contexts/ProjectContext.jsx
import React, { createContext, useContext, useState } from "react";
import { getProjectById, getProjectFiles } from "../services/projectService";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [currentProject, setCurrentProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [projectStats, setProjectStats] = useState({
    totalFiles: 0,
    totalFunctions: 0,
    totalClasses: 0,
    totalMethods: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadProject = async (projectId, token) => {
    setLoading(true);
    try {
      const [projectRes, filesRes] = await Promise.all([
        getProjectById(projectId, token),
        getProjectFiles(projectId, token),
      ]);

      setCurrentProject(projectRes.data);
      setProjectFiles(filesRes.data || []);

      // Calculate stats
      const stats = calculateProjectStats(filesRes.data || []);
      setProjectStats(stats);
    } finally {
      setLoading(false);
    }
  };

  const clearProject = () => {
    setCurrentProject(null);
    setProjectFiles([]);
    setProjectStats({
      totalFiles: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalMethods: 0,
    });
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projectFiles,
        projectStats,
        loading,
        loadProject,
        clearProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);

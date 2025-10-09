import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getPreferences,
  updatePreferences,
  createPreferences,
} from "../services/preferenceService";
import { getAllFiles } from "../services/fileService";

const PreferenceContext = createContext();

export const PreferenceProvider = ({ children }) => {
  // Step management (0 = Files, 1 = Functions/Classes, 2 = Project Preferences)
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // File tracking
  const [totalFiles, setTotalFiles] = useState(0);
  const [fileTree, setFileTree] = useState(null);
  const [allFilesData, setAllFilesData] = useState([]);

  // Preferences state
  const [preferences, setPreferences] = useState({
    directory_exclusion: {
      exclude_files: [],
      exclude_dirs: [],
    },
    function_class_selection: {
      excluded_functions: [],
      excluded_classes: [],
    },
    project_settings: {
      documentation_style: "default",
      include_private_methods: false,
      include_docstrings: true,
      max_line_length: 80,
    },
  });

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filesLoading, setFilesLoading] = useState(false);

  // Current project ID
  const [projectId, setProjectId] = useState(null);
  const [token, setToken] = useState(null);

  // Helper: check if node is a folder
  const isFolder = useCallback((node) => {
    return (
      node.type === "directory" || (node.children && node.children.length > 0)
    );
  }, []);

  // Count total files in tree
  const countTotalFiles = useCallback(
    (tree) => {
      if (!tree) return 0;

      const countFiles = (node) => {
        let count = 0;
        if (isFolder(node)) {
          node.children?.forEach((child) => {
            count += countFiles(child);
          });
        } else {
          count = 1;
        }
        return count;
      };

      return countFiles(tree);
    },
    [isFolder]
  );

  // Calculate included files count
  const getIncludedFilesCount = useCallback(() => {
    if (!fileTree) return totalFiles;

    const excludedFiles = preferences.directory_exclusion?.exclude_files || [];
    const excludedDirs = preferences.directory_exclusion?.exclude_dirs || [];

    const countIncludedFiles = (node) => {
      let count = 0;
      if (isFolder(node)) {
        // If directory is excluded, skip all its children
        if (excludedDirs.includes(node.name)) {
          return 0;
        }
        node.children?.forEach((child) => {
          count += countIncludedFiles(child);
        });
      } else {
        // Count file if it's not excluded
        if (!excludedFiles.includes(node.name)) {
          count = 1;
        }
      }
      return count;
    };

    return countIncludedFiles(fileTree);
  }, [fileTree, preferences.directory_exclusion, isFolder, totalFiles]);

  // Check if a file should be included based on preferences
  const isFileIncluded = useCallback(
    (fileName, filePath = "") => {
      const excludedFiles =
        preferences.directory_exclusion?.exclude_files || [];
      const excludedDirs = preferences.directory_exclusion?.exclude_dirs || [];

      // Check if file name is excluded
      if (excludedFiles.includes(fileName)) {
        return false;
      }

      // Check if any directory in the path is excluded
      const pathParts = filePath.split("/").filter((part) => part.length > 0);
      for (const dir of excludedDirs) {
        if (pathParts.includes(dir)) {
          return false;
        }
      }

      return true;
    },
    [preferences.directory_exclusion]
  );

  // Get all included files with their functions and classes
  const getIncludedFilesData = useCallback(() => {
    if (!allFilesData.length) return [];

    return allFilesData.filter((file) => isFileIncluded(file.name, file.path));
  }, [allFilesData, isFileIncluded]);

  // Get all functions from included files
  const getAllIncludedFunctions = useCallback(() => {
    const includedFiles = getIncludedFilesData();
    const allFunctions = [];

    includedFiles.forEach((file) => {
      if (file.functions && file.functions.length > 0) {
        file.functions.forEach((func) => {
          allFunctions.push({
            ...func,
            fileName: file.name,
            fileId: file.id,
            filePath: file.path,
          });
        });
      }
    });

    return allFunctions;
  }, [getIncludedFilesData]);

  // Get all classes from included files
  const getAllIncludedClasses = useCallback(() => {
    const includedFiles = getIncludedFilesData();
    const allClasses = [];

    includedFiles.forEach((file) => {
      if (file.classes && file.classes.length > 0) {
        file.classes.forEach((cls) => {
          allClasses.push({
            ...cls,
            fileName: file.name,
            fileId: file.id,
            filePath: file.path,
          });
        });
      }
    });

    return allClasses;
  }, [getIncludedFilesData]);

  // Get files with functions and classes for the function/class preference page
  const getFilesWithContent = useCallback(() => {
    const includedFiles = getIncludedFilesData();

    return includedFiles.filter((file) => {
      const hasFunctions = file.functions && file.functions.length > 0;
      const hasClasses = file.classes && file.classes.length > 0;
      return hasFunctions || hasClasses;
    });
  }, [getIncludedFilesData]);

  // Get total function and class counts
  const getFunctionClassCounts = useCallback(() => {
    const allFunctions = getAllIncludedFunctions();
    const allClasses = getAllIncludedClasses();

    return {
      totalFunctions: allFunctions.length,
      totalClasses: allClasses.length,
      includedFunctions: allFunctions.filter(
        (func) =>
          !preferences.function_class_selection?.excluded_functions?.includes(
            func.name
          )
      ).length,
      includedClasses: allClasses.filter(
        (cls) =>
          !preferences.function_class_selection?.excluded_classes?.includes(
            cls.name
          )
      ).length,
    };
  }, [
    getAllIncludedFunctions,
    getAllIncludedClasses,
    preferences.function_class_selection,
  ]);

  // Load all files data
  const loadAllFilesData = useCallback(async () => {
    if (!projectId || !token) return;

    setFilesLoading(true);
    try {
      const filesData = await getAllFiles(projectId, token);
      console.log("Loaded all files data:", filesData);
      setAllFilesData(filesData);
    } catch (err) {
      console.error("Error loading files data:", err);
      setError("Failed to load files data");
    } finally {
      setFilesLoading(false);
    }
  }, [projectId, token]);

  // Set file tree and calculate total files
  const setFileTreeData = useCallback(
    (tree) => {
      setFileTree(tree);
      if (tree) {
        const total = countTotalFiles(tree);
        setTotalFiles(total);
      }
    },
    [countTotalFiles]
  );

  // Initialize preferences for a project
  const initializePreferences = useCallback(
    async (projectId, token) => {
      setProjectId(projectId);
      setToken(token);
      setLoading(true);
      setError(null);

      try {
        const prefs = await getPreferences(projectId, token);
        setPreferences(prefs);
        // Mark steps as completed based on existing preferences
        const completed = new Set();
        if (
          prefs.directory_exclusion &&
          Array.isArray(prefs.directory_exclusion.exclude_files) &&
          Array.isArray(prefs.directory_exclusion.exclude_dirs)
        ) {
          completed.add(0);
        }
        if (
          prefs.function_class_selection &&
          (prefs.function_class_selection.excluded_functions?.length > 0 ||
            prefs.function_class_selection.excluded_classes?.length > 0)
        ) {
          completed.add(1);
        }
        if (
          prefs.project_settings &&
          Object.keys(prefs.project_settings).length > 0
        ) {
          completed.add(2);
        }
        setCompletedSteps(completed);
      } catch (err) {
        if (err.response?.status === 404) {
          // No preferences exist yet, start fresh
          console.log("No preferences found, starting fresh");
          setPreferences({
            directory_exclusion: {
              exclude_files: [],
              exclude_dirs: [],
            },
            function_class_selection: {
              excluded_functions: [],
              excluded_classes: [],
            },
            project_settings: {
              documentation_style: "default",
              include_private_methods: false,
              include_docstrings: true,
              max_line_length: 80,
            },
          });
          setCompletedSteps(new Set());
        } else {
          setError("Failed to load preferences");
          console.error("Error loading preferences:", err);
        }
      } finally {
        setLoading(false);
      }

      // Load files data after initializing preferences
      await loadAllFilesData();
    },
    [loadAllFilesData]
  );

  // Update a specific section of preferences
  const updateSection = useCallback((section, data) => {
    console.log(`Updating section ${section} with:`, data);
    setPreferences((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          ...data,
        },
      };
      console.log("Updated preferences:", updated);
      return updated;
    });
  }, []);

  // Save preferences to backend
  const savePreferences = useCallback(
    async (preferencesToSave) => {
      if (!projectId || !token) {
        setError("Project ID or token missing");
        return false;
      }

      // Use provided preferences or current state
      const prefsToSave = preferencesToSave || preferences;
      console.log("Saving preferences:", prefsToSave);

      setLoading(true);
      setError(null);

      try {
        // Try to update first
        try {
          await updatePreferences(projectId, prefsToSave, token);
          console.log("Preferences updated successfully");
        } catch (updateError) {
          console.log("Update failed:", updateError.response?.status);
          if (updateError.response?.status === 404) {
            // Preferences don't exist, create them
            console.log("Creating new preferences");
            await createPreferences(projectId, prefsToSave, token);
            console.log("Preferences created successfully");
          } else {
            throw updateError;
          }
        }
        return true;
      } catch (err) {
        setError("Failed to save preferences");
        console.error("Error saving preferences:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [projectId, token, preferences]
  );

  // Complete a step and unlock next
  const completeStep = useCallback(
    async (stepNumber, stepData = null) => {
      console.log(`Completing step ${stepNumber} with data:`, stepData);

      let updatedPreferences = { ...preferences };

      // Update preferences if data provided
      if (stepData) {
        const sectionMap = {
          0: "directory_exclusion",
          1: "function_class_selection",
          2: "project_settings",
        };
        const section = sectionMap[stepNumber];
        if (section) {
          updatedPreferences = {
            ...updatedPreferences,
            [section]: {
              ...updatedPreferences[section],
              ...stepData,
            },
          };
          // Update local state immediately
          setPreferences(updatedPreferences);
        }
      }

      // Save to backend with updated preferences
      const saved = await savePreferences(updatedPreferences);

      if (saved) {
        // Mark step as completed
        setCompletedSteps((prev) => {
          const newCompleted = new Set([...prev, stepNumber]);
          console.log("Updated completed steps:", newCompleted);
          return newCompleted;
        });
      }

      return saved;
    },
    [preferences, savePreferences]
  );

  // Navigate to specific step (allow access to all steps once first step is done)
  const goToStep = useCallback(
    (stepNumber) => {
      // Allow access to any step if step 0 is completed, or if going to step 0
      if (stepNumber === 0 || completedSteps.has(0)) {
        setCurrentStep(stepNumber);
        return true;
      }
      return false;
    },
    [completedSteps]
  );

  // Reset all preferences and steps
  const resetPreferences = useCallback(() => {
    setPreferences({
      directory_exclusion: {
        exclude_files: [],
        exclude_dirs: [],
      },
      function_class_selection: {
        excluded_functions: [],
        excluded_classes: [],
      },
      project_settings: {
        documentation_style: "default",
        include_private_methods: false,
        include_docstrings: true,
        max_line_length: 80,
      },
    });
    setCompletedSteps(new Set());
    setCurrentStep(0);
    setError(null);
  }, []);

  // Check if step is completed
  const isStepCompleted = useCallback(
    (stepNumber) => completedSteps.has(stepNumber),
    [completedSteps]
  );

  // Check if step is accessible
  const isStepAccessible = useCallback(
    (stepNumber) => {
      // Step 0 is always accessible
      // Other steps are accessible once step 0 is completed
      return stepNumber === 0 || completedSteps.has(0);
    },
    [completedSteps]
  );

  // Get step completion status
  const getStepStatus = useCallback(
    (stepNumber) => {
      if (completedSteps.has(stepNumber)) return "completed";
      if (currentStep === stepNumber) return "active";
      if (isStepAccessible(stepNumber)) return "accessible";
      return "locked";
    },
    [completedSteps, currentStep, isStepAccessible]
  );

  const value = {
    // Step management
    currentStep,
    setCurrentStep,
    completedSteps,
    completeStep,
    goToStep,
    isStepCompleted,
    isStepAccessible,
    getStepStatus,

    // Preferences data
    preferences,
    setPreferences,
    updateSection,

    // File tracking
    totalFiles,
    fileTree,
    setFileTreeData,
    getIncludedFilesCount,
    allFilesData,
    loadAllFilesData,

    // File and content utilities
    isFileIncluded,
    getIncludedFilesData,
    getAllIncludedFunctions,
    getAllIncludedClasses,
    getFilesWithContent,
    getFunctionClassCounts,

    // Actions
    initializePreferences,
    savePreferences,
    resetPreferences,

    // State
    loading,
    error,
    filesLoading,
    projectId,

    // Utility getters
    filePreferences: preferences.directory_exclusion,
    functionClassPreferences: preferences.function_class_selection,
    projectSettings: preferences.project_settings,
  };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferenceProvider");
  }
  return context;
};

export default PreferenceContext;

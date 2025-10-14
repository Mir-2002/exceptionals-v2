import React, { createContext, useCallback, useContext, useState } from "react";
import {
  getPreferences,
  updatePreferences,
  createPreferences,
} from "../services/preferenceService";
import { getAllFiles, getFileTree } from "../services/fileService";

const PreferenceContext = createContext();

export const PreferenceProvider = ({ children }) => {
  // Core State (add root-level format for backend compatibility)
  const [preferences, setPreferences] = useState({
    directory_exclusion: { exclude_files: [], exclude_dirs: [] },
    per_file_exclusion: [],
    project_settings: {},
    format: undefined,
  });
  const [allFilesData, setAllFilesData] = useState([]);
  const [fileTree, setFileTree] = useState(null);

  // Steps
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  // Loading / errors
  const [loading, setLoading] = useState(false);
  const [filesLoading] = useState(false);
  const [error, setError] = useState(null);

  // Project info
  const [projectId, setProjectId] = useState(null);
  const [token, setToken] = useState(null);

  // Helpers
  const normalizePath = (p) =>
    (p || "")
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "")
      .replace(/^\/+/, "");

  // Filter invalid per-file exclusion entries (empty filename, no exclusions)
  const sanitizePerFileList = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        filename: normalizePath(e.filename || ""),
        exclude_functions: Array.isArray(e.exclude_functions)
          ? e.exclude_functions
          : [],
        exclude_classes: Array.isArray(e.exclude_classes)
          ? e.exclude_classes
          : [],
        exclude_methods: Array.isArray(e.exclude_methods)
          ? e.exclude_methods
          : [],
      }))
      .filter(
        (e) =>
          e.filename &&
          (e.exclude_functions.length > 0 ||
            e.exclude_classes.length > 0 ||
            e.exclude_methods.length > 0)
      );

  // Path-based exclusion
  const isFileIncluded = useCallback(
    (fileName, filePath = "") => {
      const { exclude_files = [], exclude_dirs = [] } =
        preferences?.directory_exclusion || {};

      const normalizedPath = normalizePath(filePath || fileName);
      const exclFiles = (exclude_files || []).map(normalizePath);
      const exclDirs = (exclude_dirs || []).map(normalizePath);

      if (exclFiles.includes(normalizedPath)) return false;

      const parts = normalizedPath.split("/").filter(Boolean);
      for (let i = 1; i <= parts.length; i++) {
        const parentPath = parts.slice(0, i).join("/");
        if (exclDirs.includes(parentPath)) return false;
      }
      return true;
    },
    [preferences?.directory_exclusion]
  );

  const getIncludedFilesData = useCallback(
    () => allFilesData.filter((f) => isFileIncluded(f.name, f.path)),
    [allFilesData, isFileIncluded]
  );

  const getIncludedFilesCount = useCallback(
    () => getIncludedFilesData().length,
    [getIncludedFilesData]
  );

  const getFilesWithContent = useCallback(() => {
    return getIncludedFilesData().filter(
      (f) => (f.functions?.length || 0) > 0 || (f.classes?.length || 0) > 0
    );
  }, [getIncludedFilesData]);

  const getPerFileEntry = useCallback(
    (file) => {
      const keyPath = normalizePath(file?.path || "");
      const list = preferences?.per_file_exclusion || [];
      return (
        list.find((e) => normalizePath(e.filename) === keyPath) ||
        list.find((e) => e.filename === file?.name)
      );
    },
    [preferences?.per_file_exclusion]
  );

  const getFunctionClassCounts = useCallback(() => {
    const included = getIncludedFilesData();
    let totalFunctions = 0;
    let totalClasses = 0;
    let includedFunctions = 0;
    let includedClasses = 0;

    included.forEach((f) => {
      const funcs = f.functions || [];
      const classes = f.classes || [];
      totalFunctions += funcs.length;
      totalClasses += classes.length;

      const entry = getPerFileEntry(f);
      const excludedFns = entry?.exclude_functions || [];
      const excludedCls = entry?.exclude_classes || [];

      includedFunctions += funcs.filter(
        (fn) => !excludedFns.includes(fn.name)
      ).length;
      includedClasses += classes.filter(
        (cls) => !excludedCls.includes(cls.name)
      ).length;
    });

    return { totalFunctions, totalClasses, includedFunctions, includedClasses };
  }, [getIncludedFilesData, getPerFileEntry]);

  // Only called on save, not on load
  const markStepCompleted = useCallback((stepNumber) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepNumber);
      return next;
    });
  }, []);

  // Only called on reset
  const resetCompletedSteps = useCallback(() => {
    setCompletedSteps(new Set());
    setCurrentStep(0);
  }, []);

  // Load preferences
  const initializePreferences = useCallback(
    async (projId, authToken) => {
      if (!projId || !authToken) return;
      setProjectId(projId);
      setToken(authToken);
      setLoading(true);
      setError(null);
      try {
        const [prefs, files, tree] = await Promise.all([
          getPreferences(projId, authToken),
          getAllFiles(projId, authToken),
          getFileTree(projId, authToken),
        ]);

        const safePrefs = {
          directory_exclusion: prefs?.directory_exclusion || {
            exclude_files: [],
            exclude_dirs: [],
          },
          per_file_exclusion: sanitizePerFileList(prefs?.per_file_exclusion),
          project_settings: prefs?.project_settings || {},
          format: prefs?.format || prefs?.project_settings?.format || "HTML",
        };

        setPreferences(safePrefs);
        setAllFilesData(files || []);
        setFileTree(tree || null);
      } catch (err) {
        setPreferences({
          directory_exclusion: { exclude_files: [], exclude_dirs: [] },
          per_file_exclusion: [],
          project_settings: {},
          format: "HTML",
        });
        setAllFilesData([]);
        setFileTree(null);
        resetCompletedSteps();
        if (err?.status !== 404 && err?.response?.status !== 404) {
          setError("Failed to initialize preferences.");
        }
      } finally {
        setLoading(false);
      }
    },
    [resetCompletedSteps]
  );

  // Save / complete step
  const completeStep = useCallback(
    async (stepNumber, stepData) => {
      if (!projectId || !token) {
        setError("Project not initialized.");
        return false;
      }

      const sectionMap = {
        0: "directory_exclusion",
        1: "per_file_exclusion",
        2: "project_settings",
      };
      const section = sectionMap[stepNumber];
      if (!section) return false;

      let nextPreferences;

      if (stepNumber === 1) {
        // Ensure clean per_file_exclusion list
        nextPreferences = {
          ...preferences,
          per_file_exclusion: sanitizePerFileList(stepData),
        };
      } else if (stepNumber === 2) {
        // Persist format both root-level and project_settings
        const fmt =
          stepData.format ||
          preferences.project_settings?.format ||
          preferences.format ||
          "HTML";
        nextPreferences = {
          ...preferences,
          project_settings: {
            ...preferences.project_settings,
            ...stepData,
            format: fmt,
          },
          format: fmt,
        };
      } else {
        nextPreferences = { ...preferences, [section]: stepData };
      }

      setLoading(true);
      setError(null);
      try {
        setPreferences(nextPreferences);

        try {
          await updatePreferences(projectId, nextPreferences, token);
        } catch (err) {
          if (err?.status === 404 || err?.response?.status === 404) {
            await createPreferences(projectId, nextPreferences, token);
          } else {
            throw err;
          }
        }

        const authoritative = await getPreferences(projectId, token);
        const merged = {
          directory_exclusion: authoritative?.directory_exclusion || {
            exclude_files: [],
            exclude_dirs: [],
          },
          per_file_exclusion: sanitizePerFileList(
            authoritative?.per_file_exclusion
          ),
          project_settings: authoritative?.project_settings || {},
          format:
            authoritative?.format ||
            authoritative?.project_settings?.format ||
            nextPreferences.format ||
            "HTML",
        };

        setPreferences(merged);
        markStepCompleted(stepNumber);
        return true;
      } catch (err) {
        setError("Failed to save preferences.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [projectId, token, preferences, markStepCompleted]
  );

  // Reset
  const resetAllPreferences = useCallback(async () => {
    if (!projectId || !token) return false;
    setLoading(true);
    setError(null);
    try {
      const emptyPrefs = {
        directory_exclusion: { exclude_files: [], exclude_dirs: [] },
        per_file_exclusion: [],
        project_settings: {},
        format: "HTML",
      };
      await updatePreferences(projectId, emptyPrefs, token);
      setPreferences(emptyPrefs);
      resetCompletedSteps();
      return true;
    } catch {
      setError("Failed to reset preferences.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, token, resetCompletedSteps]);

  const isStepCompleted = useCallback(
    (n) => completedSteps.has(n),
    [completedSteps]
  );
  const isStepAccessible = useCallback(
    (n) => n === 0 || completedSteps.has(0),
    [completedSteps]
  );
  const getStepStatus = useCallback(
    (n) => {
      if (completedSteps.has(n)) return "completed";
      if (isStepAccessible(n))
        return currentStep === n ? "active" : "accessible";
      return "locked";
    },
    [completedSteps, currentStep, isStepAccessible]
  );
  const goToStep = useCallback(
    (n) => {
      if (isStepAccessible(n)) {
        setCurrentStep(n);
        return true;
      }
      return false;
    },
    [isStepAccessible]
  );

  const value = {
    loading,
    filesLoading,
    error,
    projectId,
    preferences,
    fileTree,
    allFilesData,
    completedSteps,
    currentStep,
    filePreferences: preferences.directory_exclusion,
    perFileExclusion: preferences.per_file_exclusion,
    projectSettings: preferences.project_settings,
    docFormat:
      preferences.project_settings?.format || preferences.format || "HTML",
    isFileIncluded,
    getIncludedFilesCount,
    getIncludedFilesData,
    getFilesWithContent,
    getFunctionClassCounts,
    initializePreferences,
    completeStep,
    setFileTreeData: setFileTree,
    isStepCompleted,
    isStepAccessible,
    getStepStatus,
    goToStep,
    resetAllPreferences,
  };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferenceContext);
  if (!ctx)
    throw new Error("usePreferences must be used within a PreferenceProvider");
  return ctx;
};

export default PreferenceContext;

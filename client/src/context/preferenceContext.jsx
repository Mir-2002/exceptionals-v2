import React, { createContext, useCallback, useContext, useState } from "react";
import {
  getPreferences,
  updatePreferences,
  createPreferences,
} from "../services/preferenceService";
import { getAllFiles, getFileTree } from "../services/fileService";
import {
  normalizePath,
  basename,
  pathLikeEquals,
  isSubpath,
} from "../utils/pathUtils";

const PreferenceContext = createContext();

export const PreferenceProvider = ({ children }) => {
  // Core State
  const [preferences, setPreferences] = useState({
    directory_exclusion: { exclude_files: [], exclude_dirs: [] },
    per_file_exclusion: [],
    project_settings: {},
    format: undefined,
    current_Step: 0,
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
  // Note: normalizePath and other path utilities are now imported from ../utils/pathUtils

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
  // Path-based exclusion with robust matching
  const isFileIncluded = useCallback(
    (fileName, filePath = "") => {
      const { exclude_files = [], exclude_dirs = [] } =
        preferences?.directory_exclusion || {};

      const normalizedPath = normalizePath(filePath || fileName || "");
      const exclFiles = (exclude_files || []).map(normalizePath);
      const exclDirs = (exclude_dirs || []).map(normalizePath);

      // Direct file exclusion: exact/suffix or base-name match
      if (
        exclFiles.some(
          (ef) =>
            pathLikeEquals(normalizedPath, ef) ||
            basename(ef) === basename(normalizedPath)
        )
      ) {
        return false;
      }

      // Directory exclusion: any parent is excluded
      for (const ed of exclDirs) {
        if (isSubpath(normalizedPath, ed)) return false;
      }

      return true;
    },
    [preferences?.directory_exclusion]
  );

  const getIncludedFilesData = useCallback(
    () =>
      allFilesData.filter((f) => {
        const path = normalizePath(
          f.path || f.filename || f.file_name || f.name || ""
        );
        const displayName =
          f.name || f.filename || f.file_name || basename(path);
        return isFileIncluded(displayName, path || f.path || displayName);
      }),
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
      const keyPath = normalizePath(
        file?.path || file?.filename || file?.file_name || file?.name || ""
      );
      const list = preferences?.per_file_exclusion || [];

      // Robust match by full path equivalence or basename
      return (
        list.find((e) => pathLikeEquals(e?.filename, keyPath)) ||
        list.find((e) => basename(e?.filename) === basename(keyPath))
      );
    },
    [preferences?.per_file_exclusion]
  );
  const getFunctionClassCounts = useCallback(() => {
    const included = getIncludedFilesData();
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalMethods = 0;
    let includedFunctions = 0;
    let includedClasses = 0;
    let includedMethods = 0;

    included.forEach((f) => {
      const funcs = f.functions || [];
      const classes = f.classes || [];
      totalFunctions += funcs.length;
      totalClasses += classes.length;

      classes.forEach((cls) => {
        const methods = cls.methods || [];
        totalMethods += methods.length;
      });

      const entry = getPerFileEntry(f) || {
        exclude_functions: [],
        exclude_classes: [],
        exclude_methods: [],
      };
      const excludedFns = entry.exclude_functions || [];
      const excludedCls = entry.exclude_classes || [];
      const excludedMethods = entry.exclude_methods || [];

      includedFunctions += funcs.filter(
        (fn) => !excludedFns.includes(fn.name)
      ).length;
      includedClasses += classes.filter(
        (cls) => !excludedCls.includes(cls.name)
      ).length;

      classes.forEach((cls) => {
        if (!excludedCls.includes(cls.name)) {
          const methods = cls.methods || [];
          includedMethods += methods.filter(
            (method) => !excludedMethods.includes(method.name)
          ).length;
        }
      });
    });

    return {
      totalFunctions,
      totalClasses,
      totalMethods,
      includedFunctions,
      includedClasses,
      includedMethods,
      excludedFunctions: totalFunctions - includedFunctions,
      excludedClasses: totalClasses - includedClasses,
      excludedMethods: totalMethods - includedMethods,
    };
  }, [getIncludedFilesData, getPerFileEntry]);

  // Get comprehensive counts for all items
  const getAllItemCounts = useCallback(() => {
    const totalFiles = allFilesData.length;
    const includedFiles = getIncludedFilesData();
    const excludedFiles = totalFiles - includedFiles.length;

    const functionClassCounts = getFunctionClassCounts();

    const totalItems =
      totalFiles +
      functionClassCounts.totalFunctions +
      functionClassCounts.totalClasses +
      functionClassCounts.totalMethods;
    const includedItems =
      includedFiles.length +
      functionClassCounts.includedFunctions +
      functionClassCounts.includedClasses +
      functionClassCounts.includedMethods;
    const excludedItems = totalItems - includedItems;

    return {
      files: {
        total: totalFiles,
        included: includedFiles.length,
        excluded: excludedFiles,
      },
      functions: {
        total: functionClassCounts.totalFunctions,
        included: functionClassCounts.includedFunctions,
        excluded: functionClassCounts.excludedFunctions,
      },
      classes: {
        total: functionClassCounts.totalClasses,
        included: functionClassCounts.includedClasses,
        excluded: functionClassCounts.excludedClasses,
      },
      methods: {
        total: functionClassCounts.totalMethods,
        included: functionClassCounts.includedMethods,
        excluded: functionClassCounts.excludedMethods,
      },
      overall: {
        total: totalItems,
        included: includedItems,
        excluded: excludedItems,
      },
    };
  }, [allFilesData, getIncludedFilesData, getFunctionClassCounts]);

  // Reset function/class exclusions when file preferences change
  const resetPerFileExclusionsForChangedFiles = useCallback(
    (newDirectoryExclusion) => {
      const newExcludeFiles = (newDirectoryExclusion?.exclude_files || []).map(
        normalizePath
      );
      const newExcludeDirs = (newDirectoryExclusion?.exclude_dirs || []).map(
        normalizePath
      );
      const oldExcludeFiles = (
        preferences?.directory_exclusion?.exclude_files || []
      ).map(normalizePath);
      const oldExcludeDirs = (
        preferences?.directory_exclusion?.exclude_dirs || []
      ).map(normalizePath);

      // Check if directory exclusions changed
      const filesChanged =
        JSON.stringify(newExcludeFiles.sort()) !==
        JSON.stringify(oldExcludeFiles.sort());
      const dirsChanged =
        JSON.stringify(newExcludeDirs.sort()) !==
        JSON.stringify(oldExcludeDirs.sort());

      if (filesChanged || dirsChanged) {
        // Reset per_file_exclusion to empty array when file inclusion changes
        setPreferences((prev) => ({
          ...prev,
          directory_exclusion: newDirectoryExclusion,
          per_file_exclusion: [],
        }));
        return true; // Indicate that reset occurred
      }
      return false;
    },
    [preferences?.directory_exclusion]
  );

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
        // Always try to load files and tree, independent of preferences
        const [prefsRes, files, tree] = await Promise.allSettled([
          getPreferences(projId, authToken),
          getAllFiles(projId, authToken),
          getFileTree(projId, authToken),
        ]);

        // Handle files
        if (files.status === "fulfilled") {
          setAllFilesData(Array.isArray(files.value) ? files.value : []);
        } else {
          setAllFilesData([]);
        }

        // Handle tree (fall back to empty root)
        if (tree.status === "fulfilled" && tree.value) {
          setFileTree(tree.value);
        } else {
          setFileTree({
            name: "root",
            type: "directory",
            path: "root",
            children: [],
          });
        }

        // Handle preferences
        if (prefsRes.status === "fulfilled" && prefsRes.value) {
          const prefs = prefsRes.value;
          const safePrefs = {
            directory_exclusion: prefs?.directory_exclusion || {
              exclude_files: [],
              exclude_dirs: [],
            },
            per_file_exclusion: sanitizePerFileList(prefs?.per_file_exclusion),
            project_settings: prefs?.project_settings || {},
            format: prefs?.format || prefs?.project_settings?.format || "HTML",
            current_Step: prefs?.current_Step ?? 0,
          };
          setPreferences(safePrefs);
          setCurrentStep(safePrefs.current_Step || 0);
        } else {
          // No prefs yet (e.g., 404) — keep sane defaults
          setPreferences({
            directory_exclusion: { exclude_files: [], exclude_dirs: [] },
            per_file_exclusion: [],
            project_settings: {},
            format: "HTML",
            current_Step: 0,
          });
          setCurrentStep(0);
        }
      } catch (err) {
        // Unexpected failure — set defaults but keep files/tree best-effort
        setPreferences({
          directory_exclusion: { exclude_files: [], exclude_dirs: [] },
          per_file_exclusion: [],
          project_settings: {},
          format: "HTML",
          current_Step: 0,
        });
        setCurrentStep(0);
        if (err?.status !== 404 && err?.response?.status !== 404) {
          setError("Failed to initialize preferences.");
        }
      } finally {
        setLoading(false);
      }
    },
    [sanitizePerFileList]
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

      if (stepNumber === 0) {
        // For directory exclusions, check if we need to reset per-file exclusions
        const resetOccurred = resetPerFileExclusionsForChangedFiles(stepData);
        if (resetOccurred) {
          nextPreferences = {
            ...preferences,
            directory_exclusion: stepData,
            per_file_exclusion: [],
            current_Step: stepNumber,
          };
        } else {
          nextPreferences = {
            ...preferences,
            [section]: stepData,
            current_Step: stepNumber,
          };
        }
      } else if (stepNumber === 1) {
        // Ensure clean per_file_exclusion list
        nextPreferences = {
          ...preferences,
          per_file_exclusion: sanitizePerFileList(stepData),
          current_Step: stepNumber,
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
          current_Step: stepNumber,
        };
      } else {
        nextPreferences = {
          ...preferences,
          [section]: stepData,
          current_Step: stepNumber,
        };
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
          current_Step: authoritative?.current_Step ?? stepNumber,
        };

        setPreferences(merged);
        setCurrentStep(merged.current_Step || stepNumber);
        markStepCompleted(stepNumber);
        return true;
      } catch (err) {
        setError("Failed to save preferences.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [
      projectId,
      token,
      preferences,
      markStepCompleted,
      resetPerFileExclusionsForChangedFiles,
      sanitizePerFileList,
    ]
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
        current_Step: 0,
      };
      await updatePreferences(projectId, emptyPrefs, token);
      setPreferences(emptyPrefs);
      setCurrentStep(0);
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
    setCurrentStep,
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
    getAllItemCounts,
    getPerFileEntry,
    resetPerFileExclusionsForChangedFiles,
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

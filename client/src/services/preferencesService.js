import axios from "axios";

const API_URL = "http://localhost:8000/api/projects";

// Create preferences for a project
export const createPreferences = async (projectId, preferencesData, token) => {
  try {
    return await axios.post(
      `${API_URL}/${projectId}/preferences`,
      preferencesData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Project not found or you don't have access to it");
    }
    throw error;
  }
};

// Get preferences for a project
export const getPreferences = async (projectId, token) => {
  try {
    return await axios.get(`${API_URL}/${projectId}/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (error.response?.status === 404) {
      // Return default preferences if none exist
      return {
        data: createDefaultPreferences(),
      };
    }
    throw error;
  }
};

// Update preferences for a project (partial update)
export const updatePreferences = async (projectId, preferencesData, token) => {
  try {
    return await axios.patch(
      `${API_URL}/${projectId}/preferences`,
      preferencesData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch (error) {
    if (error.response?.status === 404) {
      // If preferences don't exist, create them instead
      return await createPreferences(projectId, preferencesData, token);
    }
    throw error;
  }
};

// Delete preferences for a project
export const deletePreferences = async (projectId, token) => {
  return axios.delete(`${API_URL}/${projectId}/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Apply preferences to project (process files according to preferences)
export const applyPreferences = async (projectId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/apply-preferences`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Process project files according to preferences
export const processProjectFiles = async (projectId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/process-files`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Process a single file according to preferences
export const processSingleFile = async (projectId, fileId, token) => {
  return axios.post(
    `${API_URL}/${projectId}/files/${fileId}/process`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Process multiple files according to preferences
export const processMultipleFiles = async (projectId, fileIds, token) => {
  return axios.post(
    `${API_URL}/${projectId}/files/process`,
    { file_ids: fileIds },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Rest of your helper functions remain the same...
export const createDefaultPreferences = (outputFormat = "markdown") => {
  return {
    directory_exclusion: {
      exclude_files: [],
      exclude_dirs: [],
    },
    per_file_exclusion: [],
    format: outputFormat,
  };
};

// ... rest of your existing helper functions

// Helper function to validate preferences data
export const validatePreferences = (preferences) => {
  const errors = [];

  // Check if format is valid (changed from output_format)
  const validFormats = ["markdown", "html", "pdf"];
  if (preferences.format && !validFormats.includes(preferences.format)) {
    errors.push(`Invalid format. Must be one of: ${validFormats.join(", ")}`);
  }

  // Check directory_exclusion structure
  if (preferences.directory_exclusion) {
    const { exclude_files, exclude_dirs } = preferences.directory_exclusion;

    if (exclude_files && !Array.isArray(exclude_files)) {
      errors.push("exclude_files must be an array");
    }

    if (exclude_dirs && !Array.isArray(exclude_dirs)) {
      errors.push("exclude_dirs must be an array");
    }
  }

  // Check per_file_exclusion structure
  if (
    preferences.per_file_exclusion &&
    !Array.isArray(preferences.per_file_exclusion)
  ) {
    errors.push("per_file_exclusion must be an array");
  } else if (preferences.per_file_exclusion) {
    preferences.per_file_exclusion.forEach((fileEx, index) => {
      if (!fileEx.filename) {
        errors.push(`per_file_exclusion[${index}] must have a filename`);
      }

      if (
        fileEx.exclude_functions &&
        !Array.isArray(fileEx.exclude_functions)
      ) {
        errors.push(
          `per_file_exclusion[${index}].exclude_functions must be an array`
        );
      }

      if (fileEx.exclude_classes && !Array.isArray(fileEx.exclude_classes)) {
        errors.push(
          `per_file_exclusion[${index}].exclude_classes must be an array`
        );
      }

      if (fileEx.exclude_methods && !Array.isArray(fileEx.exclude_methods)) {
        errors.push(
          `per_file_exclusion[${index}].exclude_methods must be an array`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper function to merge exclusions from UI state into preferences format
export const buildPreferencesFromExclusions = (
  directoryExclusions = {},
  fileExclusions = {},
  outputFormat = "markdown"
) => {
  // Convert directory exclusions
  const excludeFiles = [];
  const excludeDirs = [];

  Object.keys(directoryExclusions).forEach((path) => {
    if (directoryExclusions[path]) {
      // If path contains '/', it's likely a directory or nested file
      if (path.includes("/")) {
        // Check if it's a directory by seeing if any files start with this path
        excludeDirs.push(path);
      } else {
        // Top-level file
        excludeFiles.push(path);
      }
    }
  });

  // Convert per-file exclusions
  const perFileExclusion = [];
  Object.keys(fileExclusions).forEach((filename) => {
    const exclusion = fileExclusions[filename];
    if (
      exclusion &&
      ((exclusion.functions && exclusion.functions.length > 0) ||
        (exclusion.classes && exclusion.classes.length > 0) ||
        (exclusion.methods && exclusion.methods.length > 0))
    ) {
      perFileExclusion.push({
        filename,
        exclude_functions: exclusion.functions || [],
        exclude_classes: exclusion.classes || [],
        exclude_methods: exclusion.methods || [],
      });
    }
  });

  return {
    directory_exclusion: {
      exclude_files: excludeFiles,
      exclude_dirs: excludeDirs,
    },
    per_file_exclusion: perFileExclusion,
    format: outputFormat, // Changed from output_format to format
  };
};

// Helper function to extract exclusions from preferences for UI state
export const extractExclusionsFromPreferences = (preferences) => {
  const directoryExclusions = {};
  const fileExclusions = {};

  if (preferences.directory_exclusion) {
    // Mark excluded files
    (preferences.directory_exclusion.exclude_files || []).forEach((file) => {
      directoryExclusions[file] = true;
    });

    // Mark excluded directories
    (preferences.directory_exclusion.exclude_dirs || []).forEach((dir) => {
      directoryExclusions[dir] = true;
    });
  }

  // Convert per-file exclusions
  (preferences.per_file_exclusion || []).forEach((fileEx) => {
    fileExclusions[fileEx.filename] = {
      functions: fileEx.exclude_functions || [],
      classes: fileEx.exclude_classes || [],
      methods: fileEx.exclude_methods || [],
    };
  });

  return {
    directoryExclusions,
    fileExclusions,
    outputFormat: preferences.format || "markdown", // Changed from output_format to format
  };
};

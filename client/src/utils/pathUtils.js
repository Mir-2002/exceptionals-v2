/**
 * Centralized path utilities for consistent path handling across the application.
 * These utilities ensure compatibility with the backend's file tree structure.
 */

/**
 * Normalizes a path to match backend format:
 * - Uses forward slashes as separators
 * - Removes leading ./ and /
 * - Handles empty/null/undefined inputs
 */
export const normalizePath = (p) =>
  (p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

/**
 * Gets the basename (filename) from a path
 */
export const basename = (p) => {
  const normalized = normalizePath(p);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized;
};

/**
 * Gets the directory name from a path
 */
export const dirname = (p) => {
  const normalized = normalizePath(p);
  const parts = normalized.split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
};

/**
 * Joins path segments together
 */
export const joinPath = (...segments) =>
  normalizePath(
    segments
      .filter(Boolean)
      .map((s) => String(s))
      .join("/")
  );

/**
 * Checks if two paths are exactly equal after normalization
 */
export const pathEquals = (a, b) => normalizePath(a) === normalizePath(b);

/**
 * Flexible path equality: exact match, suffix match, or basename match
 * Useful for matching file paths that might have different prefixes
 */
export const pathLikeEquals = (a, b) => {
  const A = normalizePath(a);
  const B = normalizePath(b);
  if (!A || !B) return false;
  return A === B || A.endsWith(`/${B}`) || B.endsWith(`/${A}`);
};

/**
 * Checks if a child path is inside a parent path (or equal)
 */
export const isSubpath = (child, parent) => {
  const c = normalizePath(child);
  const p = normalizePath(parent);
  if (!c || !p) return false;
  return c === p || c.startsWith(`${p}/`);
};

/**
 * Builds a consistent node path from tree nodes
 * Used for converting file tree nodes to paths
 */
export const getNodePath = (node, parentPath = "") =>
  normalizePath(
    node?.path ||
      (parentPath ? `${parentPath}/${node?.name}` : node?.name || "")
  );

/**
 * Creates a canonical key for map lookups
 * Useful for consistent key generation in state maps
 */
export const toPathKey = (p) => normalizePath(p);

/**
 * Gets file extension from a path
 */
export const getExtension = (p) => {
  const base = basename(p);
  const dotIndex = base.lastIndexOf(".");
  return dotIndex > 0 ? base.substring(dotIndex + 1).toLowerCase() : "";
};

/**
 * Checks if a path represents a Python file
 */
export const isPythonFile = (p) => getExtension(p) === "py";

/**
 * Splits a path into its component parts
 */
export const pathParts = (p) => normalizePath(p).split("/").filter(Boolean);

/**
 * Gets the depth of a path (number of directory levels)
 */
export const pathDepth = (p) => pathParts(p).length;

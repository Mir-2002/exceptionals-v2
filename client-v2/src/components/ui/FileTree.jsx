import React from "react";

const FileTreeNode = ({
  node,
  depth = 0,
  onFileClick,
  selectedFileId,
  isFileIncluded,
  getNodePath,
  parentPath = "",
}) => {
  if (!node) return null;

  const path = getNodePath(node, parentPath);

  if (!isFileIncluded(node.name, path)) return null;

  const isDir =
    node.type === "directory" ||
    node.type === "folder" ||
    Array.isArray(node.children);

  if (!isDir) {
    return (
      <div
        key={node.id || path || node.name}
        style={{ paddingLeft: `${depth * 18}px` }}
        className={`py-1 cursor-pointer truncate hover:bg-gray-100 ${
          String(selectedFileId) === String(node.id)
            ? "bg-blue-100 rounded"
            : ""
        }`}
        onClick={() => onFileClick?.(String(node.id))}
        title={path}
      >
        📄 {node.name}
      </div>
    );
  }

  const children =
    node.children
      ?.map((child) => (
        <FileTreeNode
          key={child.id || child.name}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          selectedFileId={selectedFileId}
          isFileIncluded={isFileIncluded}
          getNodePath={getNodePath}
          parentPath={path}
        />
      ))
      .filter(Boolean) || [];

  if (children.length === 0) return null;

  return (
    <div key={path || node.name}>
      <div
        style={{ paddingLeft: `${depth * 18}px` }}
        className="py-1 font-semibold text-blue-700"
      >
        📁 {node.name}
      </div>
      {children}
    </div>
  );
};

const FileTree = ({
  fileTree,
  onFileClick,
  selectedFileId,
  isFileIncluded,
  getNodePath,
  emptyMessage = "No files available",
  className = "",
}) => {
  const treeContent = fileTree ? (
    <FileTreeNode
      node={fileTree}
      onFileClick={onFileClick}
      selectedFileId={selectedFileId}
      isFileIncluded={isFileIncluded}
      getNodePath={getNodePath}
    />
  ) : null;

  return (
    <div className={`overflow-auto max-h-[70vh] ${className}`}>
      {treeContent || <p className="text-sm text-gray-500">{emptyMessage}</p>}
    </div>
  );
};

export default FileTree;

import axios from "axios";

const API_BASE = "http://localhost:8000/api/documentation";

// Send code to the demo docstring endpoint
export async function generateDocstring({ code, name, type }) {
  try {
    const res = await axios.post(`${API_BASE}/demo`, { code, name, type });
    return res.data;
  } catch (err) {
    throw new Error(
      err?.response?.data?.detail || "Docstring generation failed"
    );
  }
}

// Generate docstrings for an entire project
export const generateProjectDocstrings = async (projectId, token) => {
  return axios.post(
    `${API_BASE}/projects/${projectId}/generate`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Save a documentation revision
export const saveDocumentationRevision = async (
  projectId,
  format,
  content,
  documented,
  token,
  notes = null
) => {
  return axios.post(
    `${API_BASE}/projects/${projectId}/revisions`,
    {
      format,
      content,
      documented,
      notes,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Get all documentation revisions for a project
export const getDocumentationRevisions = async (projectId, token) => {
  return axios.get(`${API_BASE}/projects/${projectId}/revisions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Get a specific documentation revision
export const getDocumentationRevision = async (
  projectId,
  revisionId,
  token
) => {
  return axios.get(
    `${API_BASE}/projects/${projectId}/revisions/${revisionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Helper function to format documentation content based on format
export const formatDocumentationContent = (documented, format = "markdown") => {
  let content = "";

  switch (format.toLowerCase()) {
    case "markdown":
      content = generateMarkdownDocumentation(documented);
      break;
    case "html":
      content = generateHTMLDocumentation(documented);
      break;
    case "pdf":
      // For PDF, we'll generate markdown and let the server handle PDF conversion
      content = generateMarkdownDocumentation(documented);
      break;
    default:
      content = generateMarkdownDocumentation(documented);
  }

  return content;
};

// Generate Markdown documentation
const generateMarkdownDocumentation = (documented) => {
  let markdown = "# Project Documentation\n\n";

  // Group by file
  const fileGroups = {};
  documented.forEach((item) => {
    if (!fileGroups[item.file]) {
      fileGroups[item.file] = { functions: [], classes: [], methods: [] };
    }

    if (item.type === "function") {
      fileGroups[item.file].functions.push(item);
    } else if (item.type === "class") {
      fileGroups[item.file].classes.push(item);
    } else if (item.type === "method") {
      fileGroups[item.file].methods.push(item);
    }
  });

  // Generate documentation for each file
  Object.keys(fileGroups).forEach((filename) => {
    markdown += `## ${filename}\n\n`;

    const group = fileGroups[filename];

    // Functions
    if (group.functions.length > 0) {
      markdown += "### Functions\n\n";
      group.functions.forEach((func) => {
        markdown += `#### ${func.name}\n\n`;
        if (func.docstring) {
          markdown += `${func.docstring}\n\n`;
        }
        markdown += "```python\n";
        markdown += `${func.code}\n`;
        markdown += "```\n\n";
      });
    }

    // Classes
    if (group.classes.length > 0) {
      markdown += "### Classes\n\n";
      group.classes.forEach((cls) => {
        markdown += `#### ${cls.name}\n\n`;
        if (cls.docstring) {
          markdown += `${cls.docstring}\n\n`;
        }
        markdown += "```python\n";
        markdown += `${cls.code}\n`;
        markdown += "```\n\n";
      });
    }

    // Methods (if any standalone methods)
    if (group.methods.length > 0) {
      markdown += "### Methods\n\n";
      group.methods.forEach((method) => {
        markdown += `#### ${method.name}\n\n`;
        if (method.docstring) {
          markdown += `${method.docstring}\n\n`;
        }
        markdown += "```python\n";
        markdown += `${method.code}\n`;
        markdown += "```\n\n";
      });
    }
  });

  return markdown;
};

// Generate HTML documentation
const generateHTMLDocumentation = (documented) => {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3, h4 { color: #333; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        .file-section { margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .function, .class, .method { margin-bottom: 30px; }
        .docstring { background: #f9f9f9; padding: 10px; border-left: 4px solid #007acc; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Project Documentation</h1>
`;

  // Group by file
  const fileGroups = {};
  documented.forEach((item) => {
    if (!fileGroups[item.file]) {
      fileGroups[item.file] = { functions: [], classes: [], methods: [] };
    }

    if (item.type === "function") {
      fileGroups[item.file].functions.push(item);
    } else if (item.type === "class") {
      fileGroups[item.file].classes.push(item);
    } else if (item.type === "method") {
      fileGroups[item.file].methods.push(item);
    }
  });

  // Generate HTML for each file
  Object.keys(fileGroups).forEach((filename) => {
    html += `<div class="file-section">`;
    html += `<h2>${filename}</h2>`;

    const group = fileGroups[filename];

    // Functions
    if (group.functions.length > 0) {
      html += "<h3>Functions</h3>";
      group.functions.forEach((func) => {
        html += `<div class="function">`;
        html += `<h4>${func.name}</h4>`;
        if (func.docstring) {
          html += `<div class="docstring">${func.docstring.replace(
            /\n/g,
            "<br>"
          )}</div>`;
        }
        html += `<pre><code>${escapeHtml(func.code)}</code></pre>`;
        html += `</div>`;
      });
    }

    // Classes
    if (group.classes.length > 0) {
      html += "<h3>Classes</h3>";
      group.classes.forEach((cls) => {
        html += `<div class="class">`;
        html += `<h4>${cls.name}</h4>`;
        if (cls.docstring) {
          html += `<div class="docstring">${cls.docstring.replace(
            /\n/g,
            "<br>"
          )}</div>`;
        }
        html += `<pre><code>${escapeHtml(cls.code)}</code></pre>`;
        html += `</div>`;
      });
    }

    // Methods
    if (group.methods.length > 0) {
      html += "<h3>Methods</h3>";
      group.methods.forEach((method) => {
        html += `<div class="method">`;
        html += `<h4>${method.name}</h4>`;
        if (method.docstring) {
          html += `<div class="docstring">${method.docstring.replace(
            /\n/g,
            "<br>"
          )}</div>`;
        }
        html += `<pre><code>${escapeHtml(method.code)}</code></pre>`;
        html += `</div>`;
      });
    }

    html += `</div>`;
  });

  html += `
</body>
</html>`;

  return html;
};

// Helper function to escape HTML
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Helper function to download content as file
export const downloadDocumentationFile = (content, filename, format) => {
  const mimeTypes = {
    markdown: "text/markdown",
    html: "text/html",
    pdf: "application/pdf",
  };

  const blob = new Blob([content], { type: mimeTypes[format] || "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Helper function to get file extension for format
export const getFileExtension = (format) => {
  const extensions = {
    markdown: "md",
    html: "html",
    pdf: "pdf",
  };
  return extensions[format.toLowerCase()] || "txt";
};

// Helper function to format download filename
export const formatDownloadFilename = (projectName, format) => {
  const cleanName = projectName.replace(/[^a-zA-Z0-9]/g, "_");
  const extension = getFileExtension(format);
  const timestamp = new Date().toISOString().split("T")[0];
  return `${cleanName}_documentation_${timestamp}.${extension}`;
};

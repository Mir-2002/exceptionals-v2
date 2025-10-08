import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectById } from "../services/projectService";
import { getAllFiles } from "../services/fileService";
import { useAuth } from "../context/authContext";

const SetPreferences = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [functionsCount, setFunctionsCount] = useState(0);
  const [classesCount, setClassesCount] = useState(0);

  // Step completion state
  const [fileStepDone, setFileStepDone] = useState(false);
  const [funcClassStepDone, setFuncClassStepDone] = useState(false);
  const [projectStepDone, setProjectStepDone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const proj = await getProjectById(projectId, token);
      setProject(proj);

      const fileList = await getAllFiles(projectId, token);
      setFiles(fileList);

      let funcCount = 0;
      let classCount = 0;
      fileList.forEach((file) => {
        funcCount += file.functions ? file.functions.length : 0;
        classCount += file.classes ? file.classes.length : 0;
      });
      setFunctionsCount(funcCount);
      setClassesCount(classCount);
    };
    if (token) fetchData();
  }, [projectId, token]);

  return (
    <div className="flex flex-col items-center mt-10">
      <button
        className="mb-8 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <div className="flex gap-8 justify-center">
        {/* File Preferences Box */}
        <div className="bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-2">File Preferences</h2>
          <p className="mb-4">
            Total files: <span className="font-semibold">{files.length}</span>
          </p>
          <button
            className={`px-4 py-2 rounded ${
              fileStepDone
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white"
            }`}
            onClick={() => navigate(`/projects/${projectId}/preferences/files`)}
          >
            Set File Preferences
          </button>
          {!fileStepDone && (
            <p className="mt-4 text-gray-500 text-sm">
              Complete this step to unlock the next.
            </p>
          )}
        </div>

        {/* Function/Class Preferences Box */}
        <div
          className={`bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center ${
            !fileStepDone ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <h2 className="text-lg font-bold mb-2">Function/Class Preferences</h2>
          <p className="mb-2">
            Total functions:{" "}
            <span className="font-semibold">{functionsCount}</span>
          </p>
          <p className="mb-4">
            Total classes: <span className="font-semibold">{classesCount}</span>
          </p>
          <button
            className={`px-4 py-2 rounded ${
              funcClassStepDone
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white"
            }`}
            onClick={() => setFuncClassStepDone(true)}
            disabled={!fileStepDone}
          >
            Set Function and Class Preferences
          </button>
          {!funcClassStepDone && (
            <p className="mt-4 text-gray-500 text-sm">
              Set your file preferences first before setting this.
            </p>
          )}
        </div>

        {/* Project Preferences Box */}
        <div
          className={`bg-white rounded-lg shadow p-6 w-80 flex flex-col items-center ${
            !funcClassStepDone ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <h2 className="text-lg font-bold mb-2">Project Preferences</h2>
          <p className="mb-4">
            Set which format your documentation should be in.
          </p>
          <button
            className={`px-4 py-2 rounded ${
              projectStepDone
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white"
            }`}
            onClick={() => setProjectStepDone(true)}
            disabled={!funcClassStepDone}
          >
            Set Project Preference
          </button>
          {!projectStepDone && (
            <p className="mt-4 text-gray-500 text-sm">
              Set your function and class preferences first before setting this.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPreferences;

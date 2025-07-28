import React from "react";
import { FaPlus, FaFileArrowUp } from "react-icons/fa6";
import { IoIosDocument } from "react-icons/io";
import { TbPencilCog } from "react-icons/tb";
import { useNavigate } from "react-router-dom";

function ActionsButton({ children, className, onClick }) {
  return (
    <button
      className={`w-1/5 p-5 rounded-lg text-lg font-medium flex items-center justify-center gap-x-3 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-gray-100 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Actions() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-row p-5 gap-x-5 w-full h-auto items-center justify-center border-b-2 border-gray-200">
      <ActionsButton
        className="bg-primary text-white hover:bg-primary hover:text-white"
        onClick={() => navigate("/dashboard/create-project")}
      >
        <FaPlus className="text-2xl" />
        <span className="hidden md:inline">Create Project</span>
      </ActionsButton>
      <ActionsButton className="text-primary">
        <IoIosDocument className="text-2xl" />
        <span className="hidden md:inline">Generate Documentation</span>
      </ActionsButton>
      <ActionsButton className="text-primary">
        <FaFileArrowUp className="text-2xl" />
        <span className="hidden md:inline">Upload Files</span>
      </ActionsButton>
      <ActionsButton className="text-primary">
        <TbPencilCog className="text-2xl" />
        <span className="hidden md:inline">Edit Preferences</span>
      </ActionsButton>
    </div>
  );
}

export default Actions;

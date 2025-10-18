import React, { useState } from "react";
import { RiDashboardFill } from "react-icons/ri";
import {
  FaCode,
  FaGear,
  FaQuestion,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa6";

function Sidebar() {
  const [minimized, setMinimized] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-gray-100 h-full transition-all duration-300 ${
        minimized ? "w-16" : "w-[15%]"
      }`}
    >
      <button
        className="self-end w-full p-3 rounded hover:bg-gray-200 text-center flex justify-center items-center"
        onClick={() => setMinimized((prev) => !prev)}
        aria-label={minimized ? "Expand sidebar" : "Minimize sidebar"}
      >
        {minimized ? <FaArrowRight /> : <FaArrowLeft />}
      </button>
      <nav className="flex flex-col h-auto w-full">
        <ul className="flex flex-col">
          <li className="flex flex-row items-center gap-x-3 hover:bg-gray-300 p-5">
            <RiDashboardFill className="text-xl text-primary" />
            {!minimized && (
              <span className="text-lg font-medium">Dashboard</span>
            )}
          </li>
          <li className="flex flex-row items-center gap-x-3 hover:bg-gray-300 p-5">
            <FaCode className="text-xl text-primary" />
            {!minimized && (
              <span className="text-lg font-medium">Projects</span>
            )}
          </li>
          <li className="flex flex-row items-center gap-x-3 hover:bg-gray-300 p-5">
            <FaGear className="text-xl text-primary" />
            {!minimized && (
              <span className="text-lg font-medium">Settings</span>
            )}
          </li>
          <li className="flex flex-row items-center gap-x-3 hover:bg-gray-300 p-5">
            <FaQuestion className="text-xl text-primary" />
            {!minimized && (
              <span className="text-lg font-medium">Tutorial</span>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;

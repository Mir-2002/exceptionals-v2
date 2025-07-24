import React, { useState } from "react";
import Container from "../components/Container";
import { RiDashboardFill } from "react-icons/ri";
import {
  FaCode,
  FaGear,
  FaQuestion,
  FaArrowLeft,
  FaArrowRight,
  FaPlus,
  FaFileArrowUp,
  FaEye,
} from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import { IoIosDocument } from "react-icons/io";
import { TbPencilCog } from "react-icons/tb";
import { MdOutlineKeyboardArrowRight } from "react-icons/md";
import { AiFillTool } from "react-icons/ai";
import Heading from "../components/Heading";

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

function Actions() {
  function ActionsButton({ children, className, onClick }) {
    return (
      <>
        <button
          className={`w-1/5 p-5 rounded-lg text-lg font-medium flex items-center justify-center gap-x-3 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-gray-100${className}`}
          onClick={onClick}
        >
          {children}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-row p-5 gap-x-5 w-full h-auto items-center justify-center border-b-2 border-gray-200">
        <ActionsButton className="  bg-primary text-white hover:bg-primary hover:text-white">
          <FaPlus className="text-2xl" />
          <span className="hidden md:inline">Create Project</span>
        </ActionsButton>
        <ActionsButton className=" text-primary ">
          <IoIosDocument className="text-2xl" />
          <span className="hidden md:inline">Generate Documentation</span>
        </ActionsButton>
        <ActionsButton className=" text-primary">
          <FaFileArrowUp className="text-2xl" />
          <span className="hidden md:inline">Upload Files</span>
        </ActionsButton>
        <ActionsButton className=" text-primary">
          <TbPencilCog className="text-2xl" />
          <span className="hidden md:inline">Edit Preferences</span>
        </ActionsButton>
      </div>
    </>
  );
}

function ProjectsDash() {
  function ProjectInfoCards({ number, description, color, className }) {
    return (
      <>
        <div
          className={`flex flex-col items-center w-1/3 bg-${color}-200 p-5 ${className}`}
        >
          <h1
            className={`text-xl text-start w-full font-bold text-${color}-700`}
          >
            {number}
          </h1>
          <p className={`text-base text-${color}-600 text-start w-full`}>
            {description}
          </p>
        </div>
      </>
    );
  }

  function ProjectCard() {
    return (
      <>
        <div className="flex flex-row w-full h-1/5 border-2 border-gray-200 rounded-lg shadow-md ">
          <div className="flex flex-col w-1/3 justify-center p-5">
            <h1 className="text-lg font-medium">Project 1</h1>
            <p className="text-base text-secondary">Test Project</p>
          </div>
          <div className="flex flex-col w-1/3 justify-center p-5">
            <h1 className="text-lg font-medium">
              Status:{" "}
              <span className="font-medium text-green-500">COMPLETE</span>
            </h1>
            <p className="text-base text-secondary">Last Updated: 12/01/2002</p>
          </div>
          <div className="flex flex-row w-1/3 justify-end items-center gap-x-3 p-5">
            <button className="bg-primary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-primary/90 flex items-center gap-x-2">
              <FaEye className="text-base" />
              View
            </button>
            <button className="bg-secondary text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-secondary/90 flex items-center gap-x-2">
              <AiFillTool className="text-base" />
              Manage
            </button>
            <button className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-1 hover:bg-red-600 flex items-center gap-x-2">
              <FaTrashAlt className="text-base" />
              Delete
            </button>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <section className="flex flex-col w-2/3 h-full p-10 border-r-2 border-gray-200 gap-y-5">
        <Heading className="text-start">Projects</Heading>
        <div className="flex flex-row w-full items-center justify-around h-20">
          <ProjectInfoCards
            number={2}
            description="Complete"
            color="green"
            className="rounded-l-lg"
          />
          <ProjectInfoCards
            number={1}
            description="In Progress"
            color="yellow"
          />
          <ProjectInfoCards
            number={3}
            description="Empty/No Files"
            color="red"
            className="rounded-r-lg"
          />
        </div>
        <div className="flex flex-col w-full h-full items-center justify-center gap-y-3">
          <ProjectCard />
          <ProjectCard />
          <ProjectCard />
          <ProjectCard />
        </div>
      </section>
    </>
  );
}

function DocumentationsDash() {
  function DocumentationCard() {
    return (
      <>
        <div className="flex flex-row w-full h-1/5 border-2 border-gray-200">
          <div className="flex flex-col w-5/6 justify-center p-5">
            <h1 className="text-lg font-medium">Documentation Title</h1>
            <p className="text-base text-secondary">Total Files: 1</p>
            <p className="text-base text-secondary">Format: HTML</p>
          </div>
          <div className="w-1/6 h-full flex items-center justify-center hover:bg-gray-100">
            <MdOutlineKeyboardArrowRight className="text-3xl text-primary" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="flex flex-col w-1/3 h-full p-10 gap-y-5">
        <Heading className="text-start">Documentations</Heading>
        <div className="flex flex-col p-5 w-full h-full gap-y-3">
          <div className="flex flex-row items-center justify-between w-full">
            <h1 className="text-lg font-medium">Recent</h1>
            <button className="text-primary hover:bg-gray-200 p-3 rounded-md transition-all duration-200">
              View All
            </button>
          </div>

          <DocumentationCard />
          <DocumentationCard />
          <DocumentationCard />
        </div>
      </section>
    </>
  );
}

function MainDash() {
  return (
    <>
      <main className="flex flex-col items-center w-full h-full">
        <Actions />
        <div className="flex flex-row w-full h-full">
          <ProjectsDash />
          <DocumentationsDash />
        </div>
      </main>
    </>
  );
}

const Dashboard = () => {
  return (
    <>
      <Container className="flex-row w-full items-start h-screen">
        <Sidebar />
        <MainDash />
      </Container>
    </>
  );
};

export default Dashboard;

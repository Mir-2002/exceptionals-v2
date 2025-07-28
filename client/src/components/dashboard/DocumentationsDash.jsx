import React from "react";
import Heading from "../Heading";
import { MdOutlineKeyboardArrowRight } from "react-icons/md";

function DocumentationCard() {
  return (
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
  );
}

function DocumentationsDash() {
  return (
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
  );
}

export default DocumentationsDash;

import React from "react";
import Header from "../components/Header.jsx";
import Container from "../components/Container";
import Heading from "../components/Heading.jsx";

const Dashboard = () => {
  return (
    <>
      <div className="flex flex-col h-screen w-screen font-mono">
        <Header />
        <Container className="flex-1 flex-row">
          <div className="h-full w-1/3 p-5 flex flex-col items-center justify-center">
            <Heading className="text-xl">Tutorial</Heading>
          </div>
          <div className="h-full w-1/3 border-r-2 border-l-2 p-5 items-center flex flex-col justify-center">
            <Heading className="text-xl">Projects</Heading>
          </div>
          <div className="h-full w-1/3 p-5 flex flex-col items-center justify-center">
            <Heading className="text-xl">Documentations</Heading>
          </div>
        </Container>
      </div>
    </>
  );
};

export default Dashboard;

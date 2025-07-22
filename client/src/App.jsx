import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Container from "./components/Container";
import Heading from "./components/Heading";
import Subheading from "./components/Subheading";
import Button from "./components/Button";
import Login from "./pages/Login";
import { Route, Routes, useNavigate } from "react-router-dom";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Container className=" flex-row">
        <main className="flex flex-col w-1/3 h-full items-center justify-center border-r-2 border-l-2 gap-y-5">
          <Heading>Exceptionals</Heading>
          <Subheading className="w-1/2">
            Python Automatic Documentation Generator
          </Subheading>
          <Button className="text-lg" onClick={() => navigate("/login")}>
            Get Started
          </Button>
        </main>
      </Container>
    </>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;

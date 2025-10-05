import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/authContext";
import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import CreateProject from "./components/CreateProject";
import ProjectDetails from "./components/ProjectDetails";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="w-screen h-screen flex flex-col">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <>
                  <div className="h-[12vh] min-h-[70px]">
                    <Header />
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Dashboard />
                  </div>
                </>
              }
            />
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/projects/create" element={<CreateProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/authContext";
import { PreferenceProvider } from "./context/preferenceContext";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import CreateProject from "./components/CreateProject";
import ProjectDetails from "./components/ProjectDetails";
import SetPreferences from "./components/SetPreferences";
import SetFilePreferences from "./components/SetFilePreferences";
import SetFunctionClassPreference from "./components/SetFunctionClassPreference";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferenceProvider>
          <Routes>
            {/* Public routes without header */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with header and layout */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects/create" element={<CreateProject />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route
                path="/projects/:projectId/preferences"
                element={<SetPreferences />}
              />
              <Route
                path="/projects/:projectId/preferences/files"
                element={<SetFilePreferences />}
              />
              <Route
                path="/projects/:projectId/preferences/functions-classes"
                element={<SetFunctionClassPreference />}
              />
            </Route>
          </Routes>
        </PreferenceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

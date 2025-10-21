import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/authContext";
import { PreferenceProvider } from "./context/preferenceContext";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import CreateProject from "./pages/CreateProject";
import ProjectDetails from "./pages/ProjectDetails";
import EditProjectDetails from "./pages/EditProjectDetails";
import SetPreferences from "./pages/SetPreferences";
import SetFilePreferences from "./pages/SetFilePreferences";
import SetFunctionClassPreference from "./pages/SetFunctionClassPreference";
import FinalizePreference from "./pages/FinalizePreference";
import UserSettings from "./pages/UserSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFiles from "./pages/admin/AdminFiles";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminDocs from "./pages/admin/AdminDocs";
import GenerateDocumentation from "./pages/GenerateDocumentation";
import HFDemoTest from "./pages/HFDemoTest";
import DocumentationDetails from "./pages/DocumentationDetails";
import AdminDocDetails from "./pages/admin/AdminDocDetails";
import DocumentationBrowser from "./pages/DocumentationBrowser";

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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/files" element={<AdminFiles />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/documentations" element={<AdminDocs />} />
              <Route
                path="/admin/documentations/:revisionId"
                element={<AdminDocDetails />}
              />
              <Route path="/projects/create" element={<CreateProject />} />
              <Route path="/settings" element={<UserSettings />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route
                path="/projects/:projectId/edit"
                element={<EditProjectDetails />}
              />
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
              <Route
                path="/projects/:projectId/preferences/finalize"
                element={<FinalizePreference />}
              />
              <Route
                path="/projects/:projectId/documentation/generate"
                element={<GenerateDocumentation />}
              />
              <Route
                path="/projects/:projectId/documentation/:revisionId"
                element={<DocumentationDetails />}
              />
              <Route
                path="/projects/:projectId/documentation/browser"
                element={<DocumentationBrowser />}
              />
              <Route path="/debug/hf-demo" element={<HFDemoTest />} />
            </Route>
          </Routes>
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </PreferenceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

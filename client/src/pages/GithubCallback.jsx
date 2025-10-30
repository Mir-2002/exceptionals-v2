import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { showError, showSuccess } from "../utils/toast";

const API_URL = import.meta.env.VITE_API_URL;

export default function GithubCallback() {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // guard against StrictMode double-invoke
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      showError("Missing code in callback");
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/github/callback`, {
          params: { code },
        });
        const { access_token } = res.data;
        // Persist token for future sessions
        localStorage.setItem("token", access_token);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${access_token}`;
        await getCurrentUser(access_token);
        // Clean query params to avoid reusing code on refresh
        window.history.replaceState(null, "", "/");
        showSuccess("Signed in with GitHub");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        const msg = e?.response?.data?.detail || "GitHub login failed";
        showError(msg);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, getCurrentUser]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Completing GitHub sign-in…</p>
    </main>
  );
}

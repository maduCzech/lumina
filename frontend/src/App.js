import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import axios from "axios";
import { ThemeProvider } from "./context/ThemeContext";

// Pages
import Gallery from "./pages/Gallery";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Create axios instance with interceptors
export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-base)] transition-colors duration-500">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: 'var(--bg-layer-1)',
              border: '1px solid var(--glass-border-subtle)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;

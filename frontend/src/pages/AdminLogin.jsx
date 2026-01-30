import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "../App";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    checkAdminExists();
    checkExistingSession();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await api.get("/admin/check");
      setIsSetup(!response.data.exists);
    } catch (error) {
      console.error("Failed to check admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try {
        await api.get("/admin/verify");
        navigate("/admin/dashboard");
      } catch (error) {
        localStorage.removeItem("admin_token");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isSetup ? "/admin/setup" : "/admin/login";
      const response = await api.post(endpoint, formData);
      
      localStorage.setItem("admin_token", response.data.token);
      toast.success(isSetup ? "Admin account created!" : "Welcome back!");
      navigate("/admin/dashboard");
    } catch (error) {
      const message = error.response?.data?.detail || "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.username) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      {/* Background Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)]" />
      
      {/* Back to Gallery */}
      <Link
        to="/"
        className="fixed top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors z-10"
        data-testid="back-to-gallery"
      >
        <ArrowLeft size={20} />
        <span>Back to Gallery</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Glass Card */}
        <div className="relative p-8 md:p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          {/* Lock Icon */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <Lock className="w-8 h-8 text-white/80" />
          </motion.div>

          <h1 
            className="text-3xl font-bold text-center mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="login-title"
          >
            {isSetup ? "Create Admin" : "Admin Access"}
          </h1>
          <p className="text-white/50 text-center mb-8">
            {isSetup 
              ? "Set up your admin credentials to manage photos"
              : "Enter your credentials to access the dashboard"
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white/70">Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-12 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 font-medium"
              data-testid="submit-button"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                isSetup ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
};

export default AdminLogin;

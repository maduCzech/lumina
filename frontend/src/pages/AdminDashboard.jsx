import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Trash2, 
  LogOut, 
  Image as ImageIcon, 
  Plus, 
  X,
  ArrowLeft,
  Heart,
  Loader2,
  Settings,
  Sun,
  Moon,
  Tag,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { api, API } from "../App";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  
  const [photos, setPhotos] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState(null);
  const [deleteThemeSlug, setDeleteThemeSlug] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    theme: "",
    image: null,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [newTheme, setNewTheme] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    verifyAdmin();
    fetchData();
  }, []);

  const verifyAdmin = async () => {
    try {
      await api.get("/admin/verify");
    } catch (error) {
      localStorage.removeItem("admin_token");
      navigate("/admin");
    }
  };

  const fetchData = async () => {
    try {
      const [photosRes, themesRes] = await Promise.all([
        api.get("/photos"),
        api.get("/themes"),
      ]);
      setPhotos(photosRes.data);
      setThemes(themesRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin");
    toast.success("Logged out successfully");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, image: file });
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.image || !uploadForm.title || !uploadForm.theme) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("theme", uploadForm.theme);
    formData.append("image", uploadForm.image);

    try {
      const response = await api.post("/photos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotos([response.data, ...photos]);
      setShowUploadModal(false);
      setUploadForm({ title: "", description: "", theme: "", image: null });
      setPreviewImage(null);
      toast.success("Photo uploaded successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePhotoId) return;
    
    try {
      await api.delete(`/photos/${deletePhotoId}`);
      setPhotos(photos.filter(p => p.id !== deletePhotoId));
      toast.success("Photo deleted");
    } catch (error) {
      toast.error("Failed to delete photo");
    } finally {
      setDeletePhotoId(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/admin/change-password", {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      toast.success("Password changed successfully");
      setShowSettingsModal(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!newTheme.name.trim()) {
      toast.error("Theme name is required");
      return;
    }

    setCreatingTheme(true);
    try {
      const response = await api.post("/themes", {
        name: newTheme.name,
        description: newTheme.description,
      });
      setThemes([...themes, response.data]);
      toast.success("Theme created successfully");
      setNewTheme({ name: "", description: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create theme");
    } finally {
      setCreatingTheme(false);
    }
  };

  const handleDeleteTheme = async () => {
    if (!deleteThemeSlug) return;
    
    try {
      await api.delete(`/themes/${deleteThemeSlug}`);
      setThemes(themes.filter(t => t.slug !== deleteThemeSlug));
      toast.success("Theme deleted");
    } catch (error) {
      toast.error("Failed to delete theme");
    } finally {
      setDeleteThemeSlug(null);
      setShowThemeModal(true);
    }
  };

  const getImageUrl = (url) => {
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
  };

  const resetUploadForm = () => {
    setShowUploadModal(false);
    setUploadForm({ title: "", description: "", theme: "", image: null });
    setPreviewImage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-500">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--glass-border-subtle)]"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              data-testid="back-to-gallery-header"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
            <div className="h-6 w-px bg-[var(--glass-border-subtle)]" />
            <h1 
              className="text-xl font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-[var(--glass-surface-low)] border border-[var(--glass-border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-mid)] transition-all duration-300"
              whileTap={{ scale: 0.95 }}
              data-testid="theme-toggle"
            >
              <AnimatePresence mode="wait">
                {theme === "dark" ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sun size={18} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Moon size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Manage Themes */}
            <Button
              onClick={() => setShowThemeModal(true)}
              variant="ghost"
              className="rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)] gap-2"
              data-testid="manage-themes-button"
            >
              <Tag size={18} />
              <span className="hidden sm:inline">Themes</span>
            </Button>

            {/* Settings */}
            <Button
              onClick={() => setShowSettingsModal(true)}
              variant="ghost"
              className="rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)]"
              data-testid="settings-button"
            >
              <Settings size={18} />
            </Button>

            {/* Upload */}
            <Button
              onClick={() => setShowUploadModal(true)}
              className="rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.2)] gap-2"
              data-testid="upload-button"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Upload</span>
            </Button>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)]"
              data-testid="logout-button"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            <div className="glass-card rounded-2xl p-6" data-testid="stats-total">
              <p className="text-[var(--text-muted)] text-sm uppercase tracking-wider mb-1">Total Photos</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {photos.length}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-likes">
              <p className="text-[var(--text-muted)] text-sm uppercase tracking-wider mb-1">Total Likes</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {photos.reduce((acc, p) => acc + p.likes, 0)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-themes">
              <p className="text-[var(--text-muted)] text-sm uppercase tracking-wider mb-1">Themes</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {themes.length}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-recent">
              <p className="text-[var(--text-muted)] text-sm uppercase tracking-wider mb-1">This Week</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {photos.filter(p => {
                  const date = new Date(p.created_at);
                  const week = new Date();
                  week.setDate(week.getDate() - 7);
                  return date > week;
                }).length}
              </p>
            </div>
          </motion.div>

          {/* Photos Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 
              className="text-2xl font-semibold mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Your Photos
            </h2>
            
            {photos.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 text-center" data-testid="empty-state">
                <ImageIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-muted)] text-lg mb-6">No photos uploaded yet</p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90"
                >
                  Upload Your First Photo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="photos-grid">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative aspect-[4/5] rounded-2xl overflow-hidden glass-card"
                    data-testid={`admin-photo-${photo.id}`}
                  >
                    <img
                      src={getImageUrl(photo.image_url)}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="font-medium truncate text-white">{photo.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-white/50 uppercase">{photo.theme}</span>
                        <div className="flex items-center gap-1 text-white/60">
                          <Heart size={14} />
                          <span className="text-sm">{photo.likes}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeletePhotoId(photo.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
                      data-testid={`delete-photo-${photo.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={resetUploadForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass-heavy rounded-3xl p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
              data-testid="upload-modal"
            >
              <button
                onClick={resetUploadForm}
                className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)] transition-colors"
              >
                <X size={20} />
              </button>

              <h2 
                className="text-2xl font-bold mb-6"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Upload Photo
              </h2>

              <form onSubmit={handleUpload} className="space-y-5">
                {/* Image Upload Area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative aspect-video rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden ${
                    previewImage 
                      ? "border-[var(--glass-border-highlight)]" 
                      : "border-[var(--glass-border-subtle)] hover:border-[var(--glass-border-highlight)]"
                  }`}
                  data-testid="image-upload-area"
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Upload className="w-10 h-10 mb-3" />
                      <p className="text-sm">Click to upload image</p>
                      <p className="text-xs opacity-50 mt-1">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="file-input"
                  />
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[var(--text-secondary)]">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter photo title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="h-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--glass-border-highlight)] rounded-xl"
                    required
                    data-testid="title-input"
                  />
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-[var(--text-secondary)]">Theme *</Label>
                  <Select 
                    value={uploadForm.theme} 
                    onValueChange={(value) => setUploadForm({ ...uploadForm, theme: value })}
                  >
                    <SelectTrigger 
                      className="h-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] rounded-xl"
                      data-testid="theme-select"
                    >
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-[var(--bg-layer-2)] border-[var(--glass-border-subtle)] z-[200]"
                      position="popper"
                      sideOffset={4}
                    >
                      {themes.map((theme) => (
                        <SelectItem 
                          key={theme.id} 
                          value={theme.slug}
                          className="text-[var(--text-primary)] focus:bg-[var(--glass-surface-mid)] hover:bg-[var(--glass-surface-mid)] cursor-pointer"
                        >
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[var(--text-secondary)]">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description (optional)"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="min-h-[100px] bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--glass-border-highlight)] rounded-xl resize-none"
                    data-testid="description-input"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={uploading || !uploadForm.image || !uploadForm.title || !uploadForm.theme}
                  className="w-full h-12 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  data-testid="upload-submit"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Photo"
                  )}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-heavy rounded-3xl p-6 md:p-8"
              onClick={(e) => e.stopPropagation()}
              data-testid="settings-modal"
            >
              <button
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-[var(--glass-surface-low)]">
                  <Lock className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Account Settings
                </h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="h-12 pr-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl"
                      required
                      data-testid="current-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="h-12 pr-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl"
                      required
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Confirm New Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="h-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full h-12 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 disabled:opacity-50 font-medium"
                  data-testid="change-password-submit"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Management Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowThemeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-heavy rounded-3xl p-6 md:p-8 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="theme-modal"
            >
              <button
                onClick={() => setShowThemeModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-[var(--glass-surface-low)]">
                  <Tag className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Manage Themes
                </h2>
              </div>

              {/* Create New Theme */}
              <form onSubmit={handleCreateTheme} className="space-y-4 mb-8">
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">New Theme Name</Label>
                  <Input
                    placeholder="e.g., Minimalist, Street Art"
                    value={newTheme.name}
                    onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
                    className="h-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl"
                    data-testid="new-theme-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Description (optional)</Label>
                  <Input
                    placeholder="Brief description"
                    value={newTheme.description}
                    onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
                    className="h-12 bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-xl"
                    data-testid="new-theme-description"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={creatingTheme || !newTheme.name.trim()}
                  className="w-full h-11 rounded-full bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-50 font-medium"
                  data-testid="create-theme-submit"
                >
                  {creatingTheme ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Add Theme
                    </>
                  )}
                </Button>
              </form>

              {/* Existing Themes */}
              <div>
                <h3 className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-3">Existing Themes</h3>
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <div 
                      key={theme.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-surface-low)] border border-[var(--glass-border-subtle)]"
                    >
                      <div>
                        <p className="font-medium">{theme.name}</p>
                        {theme.description && (
                          <p className="text-sm text-[var(--text-muted)]">{theme.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setShowThemeModal(false);
                          setTimeout(() => setDeleteThemeSlug(theme.slug), 100);
                        }}
                        className="p-2 rounded-full text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        data-testid={`delete-theme-${theme.slug}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Photo Confirmation Dialog */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent className="bg-[var(--bg-layer-1)] border-[var(--glass-border-subtle)]" data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Delete Photo</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] hover:bg-[var(--glass-surface-mid)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Theme Confirmation Dialog */}
      <AlertDialog open={!!deleteThemeSlug} onOpenChange={(open) => {
        if (!open) {
          setDeleteThemeSlug(null);
          setShowThemeModal(true);
        }
      }}>
        <AlertDialogContent className="bg-[var(--bg-layer-1)] border-[var(--glass-border-subtle)] z-[200]" data-testid="delete-theme-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Delete Theme</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete this theme? Photos using this theme will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--glass-surface-low)] border-[var(--glass-border-subtle)] text-[var(--text-primary)] hover:bg-[var(--glass-surface-mid)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTheme}
              className="bg-red-500 hover:bg-red-600"
              data-testid="confirm-delete-theme"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;

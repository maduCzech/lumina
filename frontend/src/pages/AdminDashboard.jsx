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
  Loader2
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [photos, setPhotos] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletePhotoId, setDeletePhotoId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    theme: "",
    image: null,
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              data-testid="back-to-gallery-header"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <h1 
              className="text-xl font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dashboard
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] gap-2"
              data-testid="upload-button"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Upload Photo</span>
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="rounded-full text-white/60 hover:text-white hover:bg-white/5"
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
              <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Total Photos</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {photos.length}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-likes">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Total Likes</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {photos.reduce((acc, p) => acc + p.likes, 0)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-themes">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Themes</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {themes.length}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="stats-recent">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-1">This Week</p>
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
                <ImageIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <p className="text-white/40 text-lg mb-6">No photos uploaded yet</p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="rounded-full bg-white text-black hover:bg-white/90"
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
                      <p className="font-medium truncate">{photo.title}</p>
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
                className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
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
                      ? "border-white/20" 
                      : "border-white/10 hover:border-white/30"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                      <Upload className="w-10 h-10 mb-3" />
                      <p className="text-sm">Click to upload image</p>
                      <p className="text-xs text-white/20 mt-1">PNG, JPG, WEBP up to 10MB</p>
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
                  <Label htmlFor="title" className="text-white/70">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter photo title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl"
                    required
                    data-testid="title-input"
                  />
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-white/70">Theme *</Label>
                  <Select 
                    value={uploadForm.theme} 
                    onValueChange={(value) => setUploadForm({ ...uploadForm, theme: value })}
                  >
                    <SelectTrigger 
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                      data-testid="theme-select"
                    >
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {themes.map((theme) => (
                        <SelectItem 
                          key={theme.id} 
                          value={theme.slug}
                          className="text-white focus:bg-white/10"
                        >
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white/70">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description (optional)"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 rounded-xl resize-none"
                    data-testid="description-input"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={uploading || !uploadForm.image || !uploadForm.title || !uploadForm.theme}
                  className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/10" data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Photo</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
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
    </div>
  );
};

export default AdminDashboard;

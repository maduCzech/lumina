import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Trash2, LogOut, Image as ImageIcon, Plus, X, ArrowLeft, Heart, Loader2, Settings, Sun, Moon, Tag, Lock, Eye, EyeOff } from "lucide-react";
import { api } from "../App";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
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
  
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", theme: "", image: null });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [newTheme, setNewTheme] = useState({ name: "", description: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [photosRes, themesRes] = await Promise.all([api.get("/photos"), api.get("/themes")]);
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
    toast.success("Logged out");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("theme", uploadForm.theme);
    formData.append("image", uploadForm.image);
    try {
      const res = await api.post("/photos", formData);
      setPhotos([res.data, ...photos]);
      setShowUploadModal(false);
      setPreviewImage(null);
      toast.success("Uploaded!");
    } catch (e) { toast.error("Failed"); } finally { setUploading(false); }
  };

  const getImageUrl = (url) => url.startsWith("http") ? url : `${BACKEND_URL}${url}`;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-20 overflow-x-hidden">
      <header className="fixed top-0 inset-x-0 z-50 glass border-b border-[var(--glass-border-subtle)] px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[var(--text-secondary)]"><ArrowLeft size={20} /></Link>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowUploadModal(true)} className="rounded-full bg-white text-black size-10 p-0 sm:w-auto sm:px-4"><Plus size={20} /></Button>
          <Button onClick={handleLogout} variant="ghost"><LogOut size={20} /></Button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        {/* Stats - Responzivita */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-2xl text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase">Photos</p>
            <p className="text-2xl font-bold">{photos.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase">Likes</p>
            <p className="text-2xl font-bold">{photos.reduce((a, b) => a + b.likes, 0)}</p>
          </div>
        </div>

        {/* Grid fotek */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-[4/5] rounded-2xl overflow-hidden glass-card">
              <img src={getImageUrl(photo.image_url)} className="absolute inset-0 size-full object-cover" alt="" />
              <button onClick={() => setDeletePhotoId(photo.id)} className="absolute top-2 right-2 p-2 bg-red-500 rounded-full"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </main>

      {/* Modaly zůstávají logikou stejné, jen upravit max-width pro mobil */}
    </div>
  );
};

export default AdminDashboard;

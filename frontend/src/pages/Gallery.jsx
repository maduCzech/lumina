import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, ChevronLeft, ChevronRight, Settings, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../App";
import { toast } from "sonner";
import { useTheme } from "../context/ThemeContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Gallery = () => {
  const [photos, setPhotos] = useState([]);
  const [themes, setThemes] = useState([]);
  const [activeTheme, setActiveTheme] = useState("all");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [likedPhotos, setLikedPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchThemes();
    fetchPhotos();
  }, []);

  useEffect(() => {
    fetchPhotos(activeTheme);
  }, [activeTheme]);

  const fetchThemes = async () => {
    try {
      const response = await api.get("/themes");
      setThemes(response.data);
    } catch (error) {
      console.error("Failed to fetch themes:", error);
    }
  };

  const fetchPhotos = async (theme = "all") => {
    setLoading(true);
    try {
      const params = theme !== "all" ? { theme } : {};
      const response = await api.get("/photos", { params });
      setPhotos(response.data);
      
      const likedStatus = {};
      for (const photo of response.data) {
        try {
          const likedRes = await api.get(`/photos/${photo.id}/liked`);
          likedStatus[photo.id] = likedRes.data.liked;
        } catch (e) {
          likedStatus[photo.id] = false;
        }
      }
      setLikedPhotos(likedStatus);
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (photoId, e) => {
    e?.stopPropagation();
    try {
      const response = await api.post(`/photos/${photoId}/like`);
      if (response.data.already_liked) {
        toast.info("You've already liked this photo");
      } else {
        setPhotos(photos.map(p => 
          p.id === photoId ? { ...p, likes: response.data.likes } : p
        ));
        setLikedPhotos({ ...likedPhotos, [photoId]: true });
        toast.success("Photo liked!");
      }
    } catch (error) {
      toast.error("Failed to like photo");
    }
  };

  const getImageUrl = (url) => {
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
  };

  const navigatePhoto = useCallback((direction) => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    let newIndex;
    if (direction === "next") {
      newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    }
    setSelectedPhoto(photos[newIndex]);
  }, [selectedPhoto, photos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPhoto) return;
      if (e.key === "ArrowRight") navigatePhoto("next");
      if (e.key === "ArrowLeft") navigatePhoto("prev");
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, navigatePhoto]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-500 overflow-x-hidden">
      {/* Floating Navigation - Responzivní s posuvem */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-full bg-[var(--bg-layer-1)]/80 border border-[var(--glass-border-subtle)] backdrop-blur-xl shadow-2xl max-w-[90vw] overflow-x-auto scrollbar-hide"
      >
        <motion.button onClick={toggleTheme} className="p-2.5 shrink-0 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
        <div className="h-6 w-px bg-[var(--glass-border-subtle)] shrink-0" />
        <button
          onClick={() => setActiveTheme("all")}
          className={`px-5 py-2.5 shrink-0 rounded-full text-sm font-medium transition-all ${
            activeTheme === "all" ? "bg-[var(--text-primary)] text-[var(--bg-base)]" : "text-[var(--text-secondary)]"
          }`}
        >
          All
        </button>
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTheme(t.slug)}
            className={`px-5 py-2.5 shrink-0 rounded-full text-sm font-medium transition-all ${
              activeTheme === t.slug ? "bg-[var(--text-primary)] text-[var(--bg-base)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {t.name}
          </button>
        ))}
        <div className="h-6 w-px bg-[var(--glass-border-subtle)] shrink-0" />
        <Link to="/admin" className="p-2.5 shrink-0 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <Settings size={18} />
        </Link>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Lumina
          </motion.h1>
          <p className="text-[var(--text-secondary)] text-base md:text-xl max-w-2xl mx-auto">
            A curated collection of visual stories captured through my lens
          </p>
        </div>
      </section>

      {/* Gallery Grid - RESPONZIVNÍ SLOUPCE */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl bg-[var(--glass-surface-low)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer glass-card"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img src={getImageUrl(photo.image_url)} alt={photo.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="text-xl font-semibold text-white">{photo.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <button onClick={(e) => handleLike(photo.id, e)} className={`flex items-center gap-1 ${likedPhotos[photo.id] ? "text-red-500" : "text-white/60"}`}>
                          <Heart size={16} fill={likedPhotos[photo.id] ? "currentColor" : "none"} />
                          {photo.likes}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox - Úprava pro mobil */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <button className="absolute top-6 right-6 text-white/70" onClick={() => setSelectedPhoto(null)}><X size={24} /></button>
            <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
              <img src={getImageUrl(selectedPhoto.image_url)} className="max-w-full max-h-[70vh] object-contain rounded-lg" alt="" />
              <div className="mt-4 text-center">
                <h2 className="text-xl font-bold text-white">{selectedPhoto.title}</h2>
                <p className="text-white/60">{selectedPhoto.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;

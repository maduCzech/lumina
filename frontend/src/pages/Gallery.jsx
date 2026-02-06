import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, ChevronLeft, ChevronRight, Settings, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { api, API } from "../App";
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
      
      // Check liked status for each photo
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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-500">
      {/* Floating Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-full bg-[var(--bg-layer-1)]/80 border border-[var(--glass-border-subtle)] backdrop-blur-xl shadow-2xl"
        data-testid="main-navigation"
      >
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="p-2.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-mid)] transition-all duration-300"
          whileTap={{ scale: 0.95 }}
          data-testid="theme-toggle-nav"
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

        <div className="h-6 w-px bg-[var(--glass-border-subtle)]" />

        <button
          onClick={() => setActiveTheme("all")}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            activeTheme === "all"
              ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-[0_0_20px_var(--glass-surface-high)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)]"
          }`}
          data-testid="filter-all"
        >
          All
        </button>
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTheme(t.slug)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTheme === t.slug
                ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-[0_0_20px_var(--glass-surface-high)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)]"
            }`}
            data-testid={`filter-${t.slug}`}
          >
            {t.name}
          </button>
        ))}
        <div className="h-6 w-px bg-[var(--glass-border-subtle)]" />
        <Link
          to="/admin"
          className="p-2.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface-low)] transition-all duration-300"
          data-testid="admin-link"
        >
          <Settings size={18} />
        </Link>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="gallery-title"
          >
            Lumina
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-[var(--text-secondary)] text-lg md:text-xl max-w-2xl mx-auto"
            data-testid="gallery-subtitle"
          >
            A curated collection of visual stories captured through my lens
          </motion.p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="px-4 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] rounded-3xl bg-[var(--glass-surface-low)] animate-pulse"
                />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-[var(--text-muted)] text-lg" data-testid="no-photos-message">
                No photos yet. Check back soon!
              </p>
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
              data-testid="photo-grid"
            >
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer glass-card"
                    data-testid={`photo-card-${photo.id}`}
                  >
                    <img
                      src={getImageUrl(photo.image_url)}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Photo Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                      <h3 className="text-xl font-semibold mb-1 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {photo.title}
                      </h3>
                      {photo.description && (
                        <p className="text-white/60 text-sm line-clamp-2">{photo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          {photo.theme}
                        </span>
                        <button
                          onClick={(e) => handleLike(photo.id, e)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            likedPhotos[photo.id] ? "text-red-500" : "text-white/60 hover:text-red-500"
                          }`}
                          data-testid={`like-button-${photo.id}`}
                        >
                          <Heart size={16} fill={likedPhotos[photo.id] ? "currentColor" : "none"} />
                          {photo.likes}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setSelectedPhoto(null)}
            data-testid="lightbox"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 z-10"
              data-testid="lightbox-close"
            >
              <X size={24} />
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto("prev"); }}
              className="absolute left-4 md:left-8 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
              data-testid="lightbox-prev"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigatePhoto("next"); }}
              className="absolute right-4 md:right-8 p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
              data-testid="lightbox-next"
            >
              <ChevronRight size={24} />
            </button>

            {/* Photo */}
            <motion.div
              key={selectedPhoto.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-5xl max-h-[85vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getImageUrl(selectedPhoto.image_url)}
                alt={selectedPhoto.title}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
              
              {/* Photo Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute -bottom-20 left-0 right-0 p-4 glass rounded-2xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {selectedPhoto.title}
                    </h2>
                    {selectedPhoto.description && (
                      <p className="text-white/60 mt-1">{selectedPhoto.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleLike(selectedPhoto.id, e)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                      likedPhotos[selectedPhoto.id] 
                        ? "bg-red-500/20 text-red-500" 
                        : "bg-white/5 text-white/70 hover:bg-red-500/20 hover:text-red-500"
                    }`}
                    data-testid="lightbox-like"
                  >
                    <Heart size={20} fill={likedPhotos[selectedPhoto.id] ? "currentColor" : "none"} />
                    <span className="font-medium">{selectedPhoto.likes}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;

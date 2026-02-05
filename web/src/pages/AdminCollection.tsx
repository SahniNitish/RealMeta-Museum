import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  Images,
  Search,
  Filter,
  Trash2,
  Eye,
  AlertCircle,
  ImagePlus,
  X,
  User,
  Calendar,
  Palette,
  Play,
  Pause,
  Volume2,
  Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE, getMediaUrl } from "@/lib/api";

interface Artwork {
  _id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  description?: string;
  imageUrl: string;
  descriptions?: {
    en?: string;
    fr?: string;
    es?: string;
  };
  audioUrls?: {
    en?: string;
    fr?: string;
    es?: string;
  };
  createdAt: string;
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
];

export default function AdminCollection() {
  const { museum, token } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtwork, setSelectedArtwork] = useState<string | null>(null);
  const [viewingArtwork, setViewingArtwork] = useState<Artwork | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (museum?.id) {
      fetchArtworks();
    }
  }, [museum?.id]);

  const fetchArtworks = async () => {
    if (!museum?.id) {
      setError("No museum found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const artworksRes = await axios.get(`${API_BASE}/museums/${museum.id}/artworks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setArtworks(artworksRes.data.artworks || []);
    } catch (err) {
      console.error("Failed to fetch artworks:", err);
      setError("Failed to load artworks");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this artwork?")) return;

    try {
      await axios.delete(`${API_BASE}/admin/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setArtworks(artworks.filter(a => a._id !== id));
    } catch (err) {
      alert("Failed to delete artwork");
    }
  };

  const handleView = async (artwork: Artwork) => {
    // Fetch full artwork details
    try {
      const response = await axios.get(`${API_BASE}/visit/artwork/${artwork._id}`);
      setViewingArtwork(response.data.artwork || artwork);
    } catch {
      // If API fails, use the basic artwork data we have
      setViewingArtwork(artwork);
    }
    setIsPlaying(false);
    setSelectedLanguage("en");
  };

  const closeModal = () => {
    setViewingArtwork(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const getCurrentDescription = () => {
    if (!viewingArtwork) return "";
    const desc = viewingArtwork.descriptions?.[selectedLanguage as keyof typeof viewingArtwork.descriptions];
    return desc || viewingArtwork.description || "No description available.";
  };

  const getCurrentAudioUrl = () => {
    if (!viewingArtwork?.audioUrls) return null;
    return viewingArtwork.audioUrls[selectedLanguage as keyof typeof viewingArtwork.audioUrls];
  };

  const filteredArtworks = artworks.filter(artwork =>
    artwork.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artwork.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artwork.style?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-3xl text-foreground flex items-center gap-3"
                >
                  <Images className="w-8 h-8 text-primary" />
                  Collection
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground mt-1"
                >
                  {artworks.length} artworks in your museum collection
                </motion.p>
              </div>
              <Button variant="gold" onClick={() => navigate("/admin/upload")} className="gap-2">
                <ImagePlus className="w-4 h-4" />
                Add Artwork
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by title, artist, or style..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-2xl bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && artworks.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Images className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">No artworks yet</h3>
              <p className="text-muted-foreground mb-6">Start by uploading your first artwork</p>
              <Button variant="gold" onClick={() => navigate("/admin/upload")} className="gap-2">
                <ImagePlus className="w-4 h-4" />
                Upload Artwork
              </Button>
            </motion.div>
          )}

          {/* Artworks Grid */}
          {!loading && filteredArtworks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtworks.map((artwork, index) => (
                <motion.div
                  key={artwork._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer",
                    selectedArtwork === artwork._id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedArtwork(artwork._id === selectedArtwork ? null : artwork._id)}
                >
                  {/* Image */}
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={getMediaUrl(artwork.imageUrl)}
                      alt={artwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-display text-lg text-foreground truncate">{artwork.title || "Untitled"}</h3>
                    <p className="text-sm text-muted-foreground truncate">{artwork.author || "Unknown"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {artwork.year || "Unknown"}
                      </span>
                      {artwork.style && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {artwork.style}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(artwork);
                      }}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(artwork._id);
                      }}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Artwork Detail Modal */}
      <AnimatePresence>
        {viewingArtwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm">
                <h2 className="font-display text-xl text-foreground">Artwork Details</h2>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image */}
                  <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img
                        src={getMediaUrl(viewingArtwork.imageUrl)}
                        alt={viewingArtwork.title}
                        className="w-full aspect-[4/3] object-cover"
                      />
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Artist</p>
                          <p className="text-sm font-medium">{viewingArtwork.author || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Year</p>
                          <p className="text-sm font-medium">{viewingArtwork.year || "Unknown"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 col-span-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Style</p>
                          <p className="text-sm font-medium">{viewingArtwork.style || "Unknown"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description & Audio */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">{viewingArtwork.title}</h3>
                      <p className="text-muted-foreground">{viewingArtwork.author}, {viewingArtwork.year}</p>
                    </div>

                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Language:</span>
                      <div className="flex gap-2">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSelectedLanguage(lang.code);
                              setIsPlaying(false);
                              if (audioRef.current) audioRef.current.pause();
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm transition-colors",
                              selectedLanguage === lang.code
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 hover:bg-muted"
                            )}
                          >
                            {lang.flag} {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm text-foreground leading-relaxed">
                        {getCurrentDescription()}
                      </p>
                    </div>

                    {/* Audio Player */}
                    {getCurrentAudioUrl() && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <button
                          onClick={toggleAudio}
                          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Audio Guide ({languages.find(l => l.code === selectedLanguage)?.name})</p>
                          <p className="text-xs text-muted-foreground">Click to {isPlaying ? "pause" : "play"}</p>
                        </div>
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <audio
                          ref={audioRef}
                          src={getMediaUrl(getCurrentAudioUrl())}
                          onEnded={() => setIsPlaying(false)}
                        />
                      </div>
                    )}

                    {!getCurrentAudioUrl() && (
                      <div className="p-4 rounded-xl bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">
                          No audio guide available for this language
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(viewingArtwork._id);
                    closeModal();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

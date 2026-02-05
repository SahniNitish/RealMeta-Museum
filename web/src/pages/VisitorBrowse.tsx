import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ChevronLeft,
  Loader2,
  Images,
  X,
  User,
  Calendar,
  Palette,
  Play,
  Pause,
  Volume2,
  Camera,
  Globe,
  Image,
  Video,
  Music,
  FileText,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE, getMediaUrl } from "@/lib/api";

interface AdditionalPhoto {
  url: string;
  caption?: string;
}

interface VideoItem {
  type: 'upload' | 'youtube' | 'vimeo';
  url: string;
  embedId?: string;
  title?: string;
}

interface MusicTrack {
  url: string;
  title?: string;
  artist?: string;
}

interface DocumentFile {
  url: string;
  title?: string;
  description?: string;
}

interface Artwork {
  id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  imageUrl: string;
  description: string;
  audioUrl?: string;
  additionalPhotos?: AdditionalPhoto[];
  videos?: VideoItem[];
  musicTracks?: MusicTrack[];
  documents?: DocumentFile[];
}

interface Museum {
  id: string;
  name: string;
}

// Extended language support (16 languages)
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

export default function VisitorBrowse() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Language modal and translation states
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Media display state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [playingMusicIndex, setPlayingMusicIndex] = useState<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchArtworks();
  }, [qrCode]); // Removed selectedLanguage dependency - we translate on-demand now

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/visit/${qrCode}/artworks`, {
        params: { language: selectedLanguage },
      });
      setArtworks(response.data.artworks || []);
      setMuseum(response.data.museum);
    } catch (error) {
      console.error("Failed to fetch artworks:", error);
      alert("Failed to load collection");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedArtwork(null);
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

  // Handle language change with on-demand translation
  const handleLanguageChange = async (langCode: string) => {
    if (langCode === selectedLanguage) {
      setShowLanguageModal(false);
      return;
    }

    setSelectedLanguage(langCode);
    setShowLanguageModal(false);

    // If we have a selected artwork, translate it on-demand
    if (selectedArtwork) {
      setTranslating(true);
      try {
        const response = await axios.post(
          `${API_BASE}/visit/artwork/${selectedArtwork.id}/translate`,
          { language: langCode }
        );

        if (response.data.success) {
          setSelectedArtwork((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              description: response.data.description,
              audioUrl: response.data.audioUrl,
            };
          });

          // Reset audio player
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error("Translation failed:", error);
      } finally {
        setTranslating(false);
      }
    }
  };

  // Handle artwork selection with language
  const handleArtworkSelect = async (artwork: Artwork) => {
    setSelectedArtwork(artwork);

    // If not English, translate on-demand
    if (selectedLanguage !== "en") {
      setTranslating(true);
      try {
        const response = await axios.post(
          `${API_BASE}/visit/artwork/${artwork.id}/translate`,
          { language: selectedLanguage }
        );

        if (response.data.success) {
          setSelectedArtwork({
            ...artwork,
            description: response.data.description,
            audioUrl: response.data.audioUrl,
          });
        }
      } catch (error) {
        console.error("Translation failed:", error);
      } finally {
        setTranslating(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Loading collection...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/visit/${qrCode}`)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-lg text-foreground flex items-center gap-2">
                  <Images className="w-5 h-5 text-primary" />
                  {museum?.name} Collection
                </h1>
                <p className="text-xs text-muted-foreground">
                  {artworks.length} artworks
                </p>
              </div>
            </div>

            {/* Language selector button */}
            <button
              onClick={() => setShowLanguageModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
            >
              <span>{languages.find(l => l.code === selectedLanguage)?.flag}</span>
              <Globe className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {artworks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Images className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">
              No artworks yet
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              This museum's collection is being updated
            </p>
            <Button
              variant="gold"
              onClick={() => navigate(`/visit/${qrCode}`)}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Scan Artwork Instead
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {artworks.map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleArtworkSelect(artwork)}
                className="rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/50 transition-all"
              >
                <img
                  src={getMediaUrl(artwork.imageUrl)}
                  alt={artwork.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-3">
                  <h3 className="font-medium text-sm text-foreground truncate">
                    {artwork.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {artwork.author}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Artwork Detail Modal */}
      <AnimatePresence>
        {selectedArtwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
              <h2 className="font-display text-lg text-foreground">
                Artwork Details
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden border border-border"
              >
                <img
                  src={getMediaUrl(selectedArtwork.imageUrl)}
                  alt={selectedArtwork.title}
                  className="w-full aspect-[4/3] object-cover"
                />
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-display text-2xl text-foreground">
                    {selectedArtwork.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedArtwork.author}, {selectedArtwork.year}
                  </p>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground truncate">
                      {selectedArtwork.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground">
                      {selectedArtwork.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Palette className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground truncate">
                      {selectedArtwork.style}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedArtwork.description}
                  </p>
                </div>

                {/* Audio player */}
                {selectedArtwork.audioUrl && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <button
                      onClick={toggleAudio}
                      className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Audio Guide</p>
                      <p className="text-xs text-muted-foreground">
                        {languages.find((l) => l.code === selectedLanguage)?.name}
                      </p>
                    </div>
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <audio
                      ref={audioRef}
                      src={getMediaUrl(selectedArtwork.audioUrl)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                )}

                {/* Additional Photos */}
                {selectedArtwork.additionalPhotos && selectedArtwork.additionalPhotos.length > 0 && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4 text-primary" />
                      More Photos ({selectedArtwork.additionalPhotos.length})
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedArtwork.additionalPhotos.map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxImage(getMediaUrl(photo.url))}
                          className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={getMediaUrl(photo.url)}
                            alt={photo.caption || `Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {selectedArtwork.videos && selectedArtwork.videos.length > 0 && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4 text-primary" />
                      Videos ({selectedArtwork.videos.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedArtwork.videos.map((video, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden bg-muted/30">
                          {video.type === 'youtube' && video.embedId ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${video.embedId}`}
                              title={video.title || `Video ${idx + 1}`}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : video.type === 'vimeo' && video.embedId ? (
                            <iframe
                              src={`https://player.vimeo.com/video/${video.embedId}`}
                              title={video.title || `Video ${idx + 1}`}
                              className="w-full aspect-video"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={getMediaUrl(video.url)}
                              controls
                              className="w-full aspect-video"
                            />
                          )}
                          {video.title && (
                            <div className="p-2 border-t border-border">
                              <p className="text-xs font-medium">{video.title}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music Tracks */}
                {selectedArtwork.musicTracks && selectedArtwork.musicTracks.length > 0 && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      Music ({selectedArtwork.musicTracks.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedArtwork.musicTracks.map((track, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <button
                            onClick={() => {
                              if (playingMusicIndex === idx) {
                                musicAudioRef.current?.pause();
                                setPlayingMusicIndex(null);
                              } else {
                                if (musicAudioRef.current) {
                                  musicAudioRef.current.src = getMediaUrl(track.url);
                                  musicAudioRef.current.play();
                                }
                                setPlayingMusicIndex(idx);
                              }
                            }}
                            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                          >
                            {playingMusicIndex === idx ? (
                              <Pause className="w-3 h-3 text-primary" />
                            ) : (
                              <Play className="w-3 h-3 text-primary ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{track.title || 'Untitled'}</p>
                            {track.artist && <p className="text-xs text-muted-foreground">{track.artist}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <audio
                      ref={musicAudioRef}
                      onEnded={() => setPlayingMusicIndex(null)}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Documents */}
                {selectedArtwork.documents && selectedArtwork.documents.length > 0 && (
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Documents ({selectedArtwork.documents.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedArtwork.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={getMediaUrl(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{doc.title || 'Document'}</p>
                            {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Translating overlay in modal */}
              <AnimatePresence>
                {translating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-foreground font-medium">Translating...</p>
                      <p className="text-sm text-muted-foreground">
                        {languages.find(l => l.code === selectedLanguage)?.name}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowLanguageModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display text-lg">Select Language</h3>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        selectedLanguage === lang.code
                          ? "bg-primary/20 border-2 border-primary"
                          : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/95 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

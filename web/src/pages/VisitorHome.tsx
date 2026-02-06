import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Camera,
  Images,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  Scan,
  Play,
  Pause,
  Volume2,
  User,
  Calendar,
  Palette,
  ChevronLeft,
  X,
  Languages,
  Mail,
  Phone,
  UserCircle,
  ArrowRight,
  SkipForward
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE, getMediaUrl } from "@/lib/api";

interface Museum {
  id: string;
  name: string;
  location: string;
  description?: string;
  website?: string;
  artworkCount: number;
}

interface MatchedArtwork {
  id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  imageUrl: string;
  description: string;
  audioUrl?: string;
  matchScore: number;
  sources?: Array<{ provider: string; url: string }>;
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

export default function VisitorHome() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();

  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Visitor registration states
  const [showRegistration, setShowRegistration] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Match results
  const [matchResult, setMatchResult] = useState<{
    confident: boolean;
    bestMatch: MatchedArtwork | null;
    alternatives: MatchedArtwork[];
    noMatch?: boolean;
    message?: string;
  } | null>(null);

  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Language translation states
  const [translating, setTranslating] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    fetchMuseum();
    // Check if visitor already registered (sessionId in localStorage)
    const savedSessionId = localStorage.getItem(`visitor_session_${qrCode}`);
    if (savedSessionId) {
      setShowRegistration(false);
    }
    return () => {
      stopCamera();
    };
  }, [qrCode]);

  // Handle visitor registration
  const handleRegister = async () => {
    setRegistering(true);
    try {
      const response = await axios.post(`${API_BASE}/visit/${qrCode}/visitor`, {
        name: visitorName.trim() || undefined,
        phone: visitorPhone.trim() || undefined,
        email: visitorEmail.trim() || undefined,
        language: selectedLanguage
      });

      if (response.data.success) {
        const newSessionId = response.data.visitor.sessionId;
        localStorage.setItem(`visitor_session_${qrCode}`, newSessionId);
        setShowRegistration(false);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      // Still allow access even if registration fails
      setShowRegistration(false);
    } finally {
      setRegistering(false);
    }
  };

  // Skip registration
  const handleSkipRegistration = () => {
    setShowRegistration(false);
  };

  // Handle language change with on-demand translation
  const handleLanguageChange = async (langCode: string) => {
    if (langCode === selectedLanguage) {
      setShowLanguageModal(false);
      return;
    }

    setSelectedLanguage(langCode);
    setShowLanguageModal(false);

    // If we have a match result, translate it on-demand
    if (matchResult?.bestMatch) {
      setTranslating(true);
      try {
        const response = await axios.post(
          `${API_BASE}/visit/artwork/${matchResult.bestMatch.id}/translate`,
          { language: langCode }
        );

        if (response.data.success) {
          // Update the match result with translated content
          setMatchResult((prev) => {
            if (!prev?.bestMatch) return prev;
            return {
              ...prev,
              bestMatch: {
                ...prev.bestMatch,
                description: response.data.description,
                audioUrl: response.data.audioUrl,
              },
            };
          });

          // Reset audio player if playing
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

  const fetchMuseum = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/visit/${qrCode}`);
      setMuseum(response.data.museum);
    } catch (err) {
      console.error("Failed to fetch museum:", err);
      setError("Museum not found or invalid QR code");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      // First show camera UI so video element renders
      setShowCamera(true);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      // Wait a tick for React to render the video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setShowCamera(false);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            alert("Failed to capture photo");
            setCapturing(false);
            return;
          }

          setIdentifying(true);
          stopCamera();

          const formData = new FormData();
          formData.append("photo", blob, "artwork.jpg");
          formData.append("language", selectedLanguage);

          try {
            const response = await axios.post(
              `${API_BASE}/visit/${qrCode}/identify`,
              formData,
              { headers: { "Content-Type": "multipart/form-data" } }
            );

            setMatchResult(response.data);
          } catch (error) {
            console.error("Identification failed:", error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alert((error as any).response?.data?.error || "Failed to identify artwork");
          } finally {
            setIdentifying(false);
            setCapturing(false);
          }
        },
        "image/jpeg",
        0.85
      );
    } catch (error) {
      console.error("Capture error:", error);
      alert("Failed to capture photo");
      setCapturing(false);
      setIdentifying(false);
    }
  };

  const handleScanAnother = () => {
    setMatchResult(null);
    setShowCamera(false);
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

  // Loading state
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
          <p className="text-muted-foreground">Loading museum...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !museum) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display text-2xl text-foreground mb-2">Museum Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || "Invalid QR code"}</p>
          <Button variant="gold" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // Match results
  if (matchResult) {
    // Handle "no match" case - show friendly message
    if (matchResult.noMatch || !matchResult.bestMatch) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="px-4 py-4 flex items-center gap-4">
              <button
                onClick={handleScanAnother}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="font-display text-lg text-foreground">No Match Found</h1>
                <p className="text-xs text-muted-foreground">{museum?.name}</p>
              </div>
            </div>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Camera className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl text-foreground mb-2">Artwork Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              We couldn't identify this artwork. Please make sure you're pointing the camera directly at a painting in the museum.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button variant="gold" onClick={handleScanAnother} className="w-full gap-2">
                <Camera className="w-4 h-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate(`/visit/${qrCode}/browse`)} className="w-full gap-2">
                <Images className="w-4 h-4" />
                Browse Collection
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={handleScanAnother}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg text-foreground">
                {matchResult.confident ? "Artwork Identified!" : "Possible Match"}
              </h1>
              <p className="text-xs text-muted-foreground">{museum.name}</p>
            </div>
            {/* Language button */}
            <button
              onClick={() => setShowLanguageModal(true)}
              disabled={translating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
            >
              <span>{languages.find(l => l.code === selectedLanguage)?.flag}</span>
              {translating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        <div className="p-4">
          {matchResult.bestMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Match confidence badge */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium",
                    matchResult.bestMatch.matchScore >= 80
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : matchResult.bestMatch.matchScore >= 60
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {matchResult.bestMatch.matchScore}% Match
                </div>
              </div>

              {/* Artwork image */}
              <div className="rounded-2xl overflow-hidden border border-border">
                <img
                  src={getMediaUrl(matchResult.bestMatch.imageUrl)}
                  alt={matchResult.bestMatch.title}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>

              {/* Artwork info */}
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl text-foreground">
                    {matchResult.bestMatch.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {matchResult.bestMatch.author}, {matchResult.bestMatch.year}
                  </p>
                </div>

                {/* Quick info */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground truncate">
                      {matchResult.bestMatch.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground">
                      {matchResult.bestMatch.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Palette className="w-4 h-4 text-primary" />
                    <span className="text-xs text-foreground truncate">
                      {matchResult.bestMatch.style}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-foreground leading-relaxed">
                    {matchResult.bestMatch.description}
                  </p>
                </div>

                {/* Audio player */}
                {matchResult.bestMatch.audioUrl && (
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
                      src={getMediaUrl(matchResult.bestMatch.audioUrl)}
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 space-y-3"
          >
            <Button
              variant="gold"
              size="lg"
              className="w-full gap-2"
              onClick={handleScanAnother}
            >
              <Camera className="w-5 h-5" />
              Scan Another Artwork
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate(`/visit/${qrCode}/browse`)}
            >
              <Images className="w-5 h-5" />
              Browse Collection
            </Button>
          </motion.div>
        </div>

        {/* Translating overlay */}
        <AnimatePresence>
          {translating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-foreground font-medium">Translating...</p>
                <p className="text-sm text-muted-foreground">
                  Switching to {languages.find(l => l.code === selectedLanguage)?.name}
                </p>
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
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
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
      </div>
    );
  }

  // Camera interface
  if (showCamera) {
    return (
      <div className="min-h-screen bg-background">
        <header className="absolute top-0 left-0 right-0 z-40 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={stopCamera}
              disabled={capturing || identifying}
              className="p-2 rounded-lg bg-background/80 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-sm">
              {languages.find((l) => l.code === selectedLanguage)?.flag}{" "}
              {languages.find((l) => l.code === selectedLanguage)?.name}
            </div>
          </div>
        </header>

        <div className="relative h-screen">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-primary rounded-2xl">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>

          {/* Identifying overlay */}
          <AnimatePresence>
            {identifying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center"
              >
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-foreground font-medium">Identifying artwork...</p>
                  <p className="text-sm text-muted-foreground">
                    Matching against museum collection
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Capture button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={captureAndIdentify}
              disabled={capturing || identifying}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
            >
              {capturing ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
              ) : (
                <Scan className="w-8 h-8 text-primary-foreground" />
              )}
            </button>
          </div>

          <p className="absolute bottom-32 left-0 right-0 text-center text-sm text-foreground/80">
            Point camera at artwork and tap to identify
          </p>
        </div>
      </div>
    );
  }

  // Visitor Registration Form
  if (showRegistration && museum) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-4 py-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl">{"🏛️"}</span>
              </div>
              <div>
                <h1 className="font-display text-lg text-foreground">{museum.name}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {museum.location}
                </p>
              </div>
            </motion.div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Welcome message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl text-foreground mb-2">Welcome!</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Tell us a bit about yourself to enhance your visit (optional)
            </p>
          </motion.div>

          {/* Registration form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Name
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Phone input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
              </label>
              <input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="Your phone number (optional)"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </label>
              <input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="Your email (optional)"
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Language selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                Preferred Language
              </label>
              <button
                onClick={() => setShowLanguageModal(true)}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground flex items-center justify-between hover:bg-muted/50 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{languages.find(l => l.code === selectedLanguage)?.flag}</span>
                  {languages.find(l => l.code === selectedLanguage)?.name}
                </span>
                <Globe className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3 pt-4"
          >
            <Button
              variant="gold"
              size="lg"
              className="w-full gap-2"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={handleSkipRegistration}
              disabled={registering}
            >
              <SkipForward className="w-5 h-5" />
              Skip for now
            </Button>
          </motion.div>

          {/* Privacy note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-muted-foreground text-center"
          >
            Your information is only used to enhance your museum experience and is never shared.
          </motion.p>
        </div>

        {/* Language Selection Modal */}
        <AnimatePresence>
          {showLanguageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
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
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setShowLanguageModal(false);
                        }}
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
      </div>
    );
  }

  // Welcome screen
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">{"🏛️"}</span>
            </div>
            <div>
              <h1 className="font-display text-lg text-foreground">{museum.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {museum.location}
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Museum info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          {museum.description && (
            <p className="text-sm text-muted-foreground mb-3">{museum.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-foreground">
              <strong>{museum.artworkCount}</strong> artworks
            </span>
            {museum.website && (
              <a
                href={museum.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
          </div>
        </motion.div>

        {/* Language selector - compact with current selection and change button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Audio Language</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>{languages.find(l => l.code === selectedLanguage)?.flag}</span>
                  {languages.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLanguageModal(true)}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              Change
            </Button>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <Button
            variant="gold"
            size="xl"
            className="w-full gap-3"
            onClick={startCamera}
          >
            <Camera className="w-6 h-6" />
            Scan Artwork
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate(`/visit/${qrCode}/browse`)}
          >
            <Images className="w-5 h-5" />
            Browse Collection
          </Button>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl bg-muted/30 border border-border"
        >
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">{"📱"}</span>
            How to Use
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              Select your preferred language
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              Tap "Scan Artwork" to open the camera
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              Point at any artwork and capture
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              Get instant info and audio guide
            </li>
          </ol>
        </motion.div>
      </div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
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
    </div>
  );
}

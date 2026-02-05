import { motion } from "framer-motion";
import {
  User,
  Calendar,
  Palette,
  MapPin,
  FileText,
  Languages,
  Volume2,
  Play,
  Pause,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Image,
  Video,
  Music,
  Download,
  X
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/lib/api";

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

interface ArtworkInfo {
  id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  description: string;
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
  sources?: Array<{ provider: string; url: string }>;
  externalLinks?: Array<{ label: string; url: string }>;
  additionalPhotos?: AdditionalPhoto[];
  videos?: VideoItem[];
  musicTracks?: MusicTrack[];
  documents?: DocumentFile[];
}

interface ArtworkInfoCardProps {
  info: ArtworkInfo;
  imageUrl: string;
  apiHost?: string; // Deprecated, using getMediaUrl now
  onSave?: () => void;
  onEdit?: () => void;
  isSaving?: boolean;
}

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
];

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
  >
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "Unknown"}</p>
    </div>
  </motion.div>
);

export const ArtworkInfoCard = ({ info, imageUrl, onSave, onEdit, isSaving }: ArtworkInfoCardProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Media display state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [playingMusicIndex, setPlayingMusicIndex] = useState<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);

  const currentDescription = info.descriptions?.[selectedLanguage as keyof typeof info.descriptions] || info.description;
  const currentAudioUrl = info.audioUrls?.[selectedLanguage as keyof typeof info.audioUrls];

  const toggleAudio = () => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 xl:grid-cols-3 gap-8"
    >
      {/* Left: Image + Quick Info */}
      <div className="xl:col-span-1 space-y-6">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden shadow-card border border-border"
        >
          <img
            src={getMediaUrl(imageUrl)}
            alt={info.title}
            className="w-full aspect-[4/3] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl text-foreground mb-1"
            >
              {info.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground"
            >
              {info.author}, {info.year}
            </motion.p>
          </div>
        </motion.div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem icon={User} label="Artist" value={info.author} />
          <InfoItem icon={Calendar} label="Year" value={info.year} />
          <InfoItem icon={Palette} label="Style" value={info.style} />
          <InfoItem icon={MapPin} label="Period" value={info.style} />
        </div>
      </div>

      {/* Right: Descriptions + Languages + Audio */}
      <div className="xl:col-span-2 space-y-6">
        {/* Description Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-card border border-border"
        >
          <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            Description
          </h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {currentDescription}
          </p>
        </motion.div>

        {/* Sources */}
        {info.sources && info.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              Sources
            </h3>
            <div className="flex flex-wrap gap-2">
              {info.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {source.provider}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* External Links */}
        {info.externalLinks && info.externalLinks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              External Resources
            </h3>
            <div className="space-y-2">
              {info.externalLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <span className="font-medium text-sm text-foreground">{link.label}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{link.url}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Additional Photos Gallery */}
        {info.additionalPhotos && info.additionalPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="w-4 h-4 text-primary" />
              </div>
              Additional Photos ({info.additionalPhotos.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {info.additionalPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxImage(getMediaUrl(photo.url))}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={getMediaUrl(photo.url)}
                    alt={photo.caption || `Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Videos Section */}
        {info.videos && info.videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="w-4 h-4 text-primary" />
              </div>
              Videos ({info.videos.length})
            </h3>
            <div className="space-y-4">
              {info.videos.map((video, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden bg-muted/30">
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
                    <div className="p-3 border-t border-border">
                      <p className="text-sm font-medium">{video.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Music Tracks Section */}
        {info.musicTracks && info.musicTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Music className="w-4 h-4 text-primary" />
              </div>
              Music ({info.musicTracks.length})
            </h3>
            <div className="space-y-2">
              {info.musicTracks.map((track, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
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
                    className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
                  >
                    {playingMusicIndex === idx ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.title || 'Untitled Track'}</p>
                    {track.artist && <p className="text-xs text-muted-foreground">{track.artist}</p>}
                  </div>
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
            <audio
              ref={musicAudioRef}
              onEnded={() => setPlayingMusicIndex(null)}
              className="hidden"
            />
          </motion.div>
        )}

        {/* Documents Section */}
        {info.documents && info.documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h3 className="font-display text-lg text-foreground mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              Documents ({info.documents.length})
            </h3>
            <div className="space-y-2">
              {info.documents.map((doc, idx) => (
                <a
                  key={idx}
                  href={getMediaUrl(doc.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title || 'Document'}</p>
                    {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Languages & Audio Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-card to-surface-elevated border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Languages className="w-4 h-4 text-primary" />
              </div>
              Translations & Audio Guides
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-primary" />
              <span>{languages.length} languages ready</span>
            </div>
          </div>

          {/* Language Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
            {languages.slice(0, showAllLanguages ? 10 : 5).map((lang, index) => (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => setSelectedLanguage(lang.code)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200",
                  selectedLanguage === lang.code
                    ? "bg-primary/20 border-2 border-primary shadow-glow"
                    : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-xs font-medium text-foreground">{lang.name}</span>
              </motion.button>
            ))}
          </div>

          {!showAllLanguages && languages.length > 5 && (
            <button
              onClick={() => setShowAllLanguages(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
            >
              <ChevronDown className="w-4 h-4" />
              Show all {languages.length} languages
            </button>
          )}

          {/* Audio Player */}
          {currentAudioUrl && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
              <Button
                variant="gold"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleAudio}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  Audio Guide ({languages.find(l => l.code === selectedLanguage)?.name})
                </p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: isPlaying ? "100%" : "0%" }}
                    transition={{ duration: 30, ease: "linear" }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <audio
                ref={audioRef}
                src={getMediaUrl(currentAudioUrl)}
                onEnded={handleAudioEnded}
              />
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-4"
        >
          <Button variant="gold" size="lg" className="flex-1" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save to Collection"
            )}
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={onEdit}>
            Edit Information
          </Button>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
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
    </motion.div>
  );
};

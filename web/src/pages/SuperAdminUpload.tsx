import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { UploadZone } from "@/components/admin/UploadZone";
import { AnalyzingOverlay } from "@/components/admin/AnalyzingOverlay";
import { SavingOverlay } from "@/components/admin/SavingOverlay";
import { ArtworkInfoCard } from "@/components/admin/ArtworkInfoCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, AlertCircle, X, Check, Image, Video, Music, FileText, Upload, Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_HOST, API_BASE, getMediaUrl } from "@/lib/api";

export default function SuperAdminUpload() {
  const { id: museumId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [museumName, setMuseumName] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [artworkInfo, setArtworkInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    year: "",
    style: "",
    description: "",
    externalLinks: [] as { label: string; url: string }[]
  });
  const [newLink, setNewLink] = useState({ label: "", url: "" });

  // Media upload state
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos' | 'music' | 'documents'>('photos');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch museum name
  useEffect(() => {
    if (!museumId) return;
    const fetchMuseum = async () => {
      try {
        const res = await axios.get(`${API_BASE}/superadmin/museums/${museumId}/artworks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMuseumName(res.data.museum?.name || "Museum");
      } catch {
        // Fallback — page still works without museum name
      }
    };
    fetchMuseum();
  }, [museumId, token]);

  const handleImageUpload = (file: File, preview: string) => {
    setUploadedImage(preview);
    setUploadedFile(file);
    setAnalysisComplete(false);
    setArtworkInfo(null);
    setError(null);
    setSaveSuccess(false);
  };

  const handleClear = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setAnalysisComplete(false);
    setArtworkInfo(null);
    setCurrentStep(0);
    setError(null);
    setIsEditing(false);
    setSaveSuccess(false);
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !museumId) return;

    setIsAnalyzing(true);
    setCurrentStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 3) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("museumId", museumId);

      const response = await axios.post(`${API_BASE}/admin/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      clearInterval(stepInterval);
      setCurrentStep(3);

      setTimeout(() => {
        const info = {
          id: response.data.id,
          title: response.data.ai?.title || "Untitled",
          author: response.data.ai?.author || "Unknown Artist",
          year: response.data.ai?.year || "Unknown",
          style: response.data.ai?.style || "Unknown",
          description: response.data.ai?.description || response.data.descriptions?.english || "",
          descriptions: {
            en: response.data.descriptions?.english,
            fr: response.data.descriptions?.french,
            es: response.data.descriptions?.spanish,
          },
          audioUrls: {
            en: response.data.audioUrls?.english,
            fr: response.data.audioUrls?.french,
            es: response.data.audioUrls?.spanish,
          },
          imageUrl: response.data.imageUrl,
          sources: response.data.wiki?.sources || [],
        };
        setArtworkInfo(info);
        setEditForm({
          title: info.title,
          author: info.author,
          year: info.year,
          style: info.style,
          description: info.description,
          externalLinks: []
        });
        setIsAnalyzing(false);
        setAnalysisComplete(true);
      }, 1000);

    } catch (err: any) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      const errorMsg = err.response?.data?.error || err.message || "Upload failed";
      setError(errorMsg);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      title: artworkInfo?.title || "",
      author: artworkInfo?.author || "",
      year: artworkInfo?.year || "",
      style: artworkInfo?.style || "",
      description: artworkInfo?.description || "",
      externalLinks: artworkInfo?.externalLinks || []
    });
    setNewLink({ label: "", url: "" });
  };

  const handleAddLink = () => {
    if (newLink.label.trim() && newLink.url.trim()) {
      setEditForm({
        ...editForm,
        externalLinks: [...editForm.externalLinks, { label: newLink.label.trim(), url: newLink.url.trim() }]
      });
      setNewLink({ label: "", url: "" });
    }
  };

  const handleRemoveLink = (index: number) => {
    setEditForm({
      ...editForm,
      externalLinks: editForm.externalLinks.filter((_, i) => i !== index)
    });
  };

  const handleEditSave = () => {
    setArtworkInfo({
      ...artworkInfo,
      ...editForm
    });
    setIsEditing(false);
  };

  // Media upload handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!artworkInfo?.id || !e.target.files?.length) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach(file => formData.append('photos', file));
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/media/photos`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      setArtworkInfo({ ...artworkInfo, additionalPhotos: response.data.photos });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!artworkInfo?.id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', e.target.files[0]);
      formData.append('title', videoTitle || e.target.files[0].name);
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/media/videos`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      setArtworkInfo({ ...artworkInfo, videos: response.data.videos });
      setVideoTitle('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload video');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoUrlAdd = async () => {
    if (!artworkInfo?.id || !videoUrl) return;
    setMediaUploading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/media/videos`,
        { videoUrl, title: videoTitle },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setArtworkInfo({ ...artworkInfo, videos: response.data.videos });
      setVideoUrl('');
      setVideoTitle('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add video');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!artworkInfo?.id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('music', e.target.files[0]);
      formData.append('title', musicTitle || e.target.files[0].name);
      formData.append('artist', musicArtist);
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/media/music`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      setArtworkInfo({ ...artworkInfo, musicTracks: response.data.musicTracks });
      setMusicTitle('');
      setMusicArtist('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload music');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!artworkInfo?.id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', e.target.files[0]);
      formData.append('title', docTitle || e.target.files[0].name);
      formData.append('description', docDescription);
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/media/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      setArtworkInfo({ ...artworkInfo, documents: response.data.documents });
      setDocTitle('');
      setDocDescription('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (type: string, index: number) => {
    if (!artworkInfo?.id) return;
    try {
      const response = await axios.delete(
        `${API_BASE}/admin/${artworkInfo.id}/media/${type}/${index}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const fieldMap: Record<string, string> = {
        photos: 'additionalPhotos',
        videos: 'videos',
        music: 'musicTracks',
        documents: 'documents'
      };
      setArtworkInfo({ ...artworkInfo, [fieldMap[type]]: response.data[fieldMap[type]] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete media');
    }
  };

  const handleSave = async () => {
    if (!artworkInfo?.id) {
      setError("No artwork ID found. Please try uploading again.");
      return;
    }

    const descriptionToSave = artworkInfo.description || artworkInfo.descriptions?.en || "Artwork in museum collection.";

    if (!descriptionToSave || descriptionToSave.trim().length === 0) {
      setError("Description is required. Please add a description before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await axios.post(
        `${API_BASE}/admin/${artworkInfo.id}/finalize`,
        {
          title: artworkInfo.title,
          author: artworkInfo.author,
          year: artworkInfo.year,
          style: artworkInfo.style,
          description: descriptionToSave,
          sources: artworkInfo.sources,
          externalLinks: artworkInfo.externalLinks || [],
          sourceLanguage: "en",
        },
        {
          timeout: 180000,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      setArtworkInfo({
        ...artworkInfo,
        descriptions: {
          en: response.data.descriptions?.english,
          fr: response.data.descriptions?.french,
          es: response.data.descriptions?.spanish,
        },
        audioUrls: {
          en: response.data.audioUrls?.english,
          fr: response.data.audioUrls?.french,
          es: response.data.audioUrls?.spanish,
        },
      });

      setSaveSuccess(true);
      // Navigate back to museum detail after success
      setTimeout(() => {
        navigate(`/superadmin/museums/${museumId}`);
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to save. Please try again.";
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <button
              onClick={() => navigate(`/superadmin/museums/${museumId}`)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to {museumName || "Museum"}</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-3xl text-foreground"
                >
                  Upload Artwork
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground mt-1"
                >
                  {museumName ? `Add new artwork to ${museumName}` : "Add new artwork with AI-powered analysis"}
                </motion.p>
              </div>
              {analysisComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button variant="outline" onClick={handleClear} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Upload New
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Success Message */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-green-500" />
              <p className="text-green-500 font-medium">Artwork saved successfully! Redirecting...</p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Museum ID Not Ready Warning */}
          {!museumId && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">No museum ID found in URL.</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!analysisComplete ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <UploadZone
                  onImageUpload={handleImageUpload}
                  uploadedImage={uploadedImage}
                  onClear={handleClear}
                />

                {uploadedImage && !isAnalyzing && museumId && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <Button
                      variant="gold"
                      size="xl"
                      onClick={handleAnalyze}
                      className="gap-3"
                    >
                      <Sparkles className="w-5 h-5" />
                      Analyze with AI
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {artworkInfo && (
                  <ArtworkInfoCard
                    info={artworkInfo}
                    imageUrl={artworkInfo.imageUrl}
                    apiHost={API_HOST}
                    onSave={handleSave}
                    onEdit={handleEdit}
                    isSaving={isSaving}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl mx-4 rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
                <h2 className="font-display text-2xl text-foreground">Edit Artwork Information</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Artist</label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Year</label>
                    <input
                      type="text"
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Style</label>
                  <input
                    type="text"
                    value={editForm.style}
                    onChange={(e) => setEditForm({ ...editForm, style: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                {/* External Links Section */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">External Links (Google Drive, Resources, etc.)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Link label (e.g., 'High-res Image')"
                      value={newLink.label}
                      onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <input
                      type="url"
                      placeholder="URL (https://...)"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="flex-[2] px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddLink}
                      className="px-3"
                    >
                      + Add
                    </Button>
                  </div>
                  {editForm.externalLinks.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {editForm.externalLinks.map((link, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border"
                        >
                          <span className="font-medium text-sm text-foreground">{link.label}:</span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm flex-1 truncate hover:underline"
                          >
                            {link.url}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(index)}
                            className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Add external resource links like Google Drive, high-resolution images, or documents</p>
                </div>

                {/* Additional Media Section */}
                {artworkInfo?.id && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMediaExpanded(!mediaExpanded)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-foreground">Additional Media</span>
                      {mediaExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {mediaExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Media Tabs */}
                        <div className="flex gap-2 border-b border-border pb-2">
                          {[
                            { id: 'photos' as const, label: 'Photos', icon: Image },
                            { id: 'videos' as const, label: 'Videos', icon: Video },
                            { id: 'music' as const, label: 'Music', icon: Music },
                            { id: 'documents' as const, label: 'Documents', icon: FileText },
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setMediaTab(tab.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                mediaTab === tab.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <tab.icon className="w-4 h-4" />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Photos Tab */}
                        {mediaTab === 'photos' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <label className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Upload Photos (max 10)</span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  multiple
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                  disabled={mediaUploading}
                                />
                              </label>
                            </div>
                            {artworkInfo?.additionalPhotos?.length > 0 && (
                              <div className="grid grid-cols-4 gap-2">
                                {artworkInfo.additionalPhotos.map((photo: { url: string; caption?: string }, idx: number) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={getMediaUrl(photo.url)}
                                      alt={photo.caption || `Photo ${idx + 1}`}
                                      className="w-full h-20 object-cover rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMedia('photos', idx)}
                                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Videos Tab */}
                        {mediaTab === 'videos' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Video title (optional)"
                                value={videoTitle}
                                onChange={e => setVideoTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="YouTube or Vimeo URL"
                                  value={videoUrl}
                                  onChange={e => setVideoUrl(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleVideoUrlAdd}
                                  disabled={!videoUrl || mediaUploading}
                                >
                                  Add URL
                                </Button>
                              </div>
                              <div className="text-center text-sm text-muted-foreground">or</div>
                              <label className="cursor-pointer">
                                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">Upload Video File (MP4, WebM, MOV - max 100MB)</span>
                                </div>
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime"
                                  onChange={handleVideoFileUpload}
                                  className="hidden"
                                  disabled={mediaUploading}
                                />
                              </label>
                            </div>
                            {artworkInfo?.videos?.length > 0 && (
                              <div className="space-y-2">
                                {artworkInfo.videos.map((video: { type: string; url: string; embedId?: string; title?: string }, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                    <span className="flex-1 text-sm truncate">{video.title || video.url}</span>
                                    <span className="text-xs text-muted-foreground capitalize">{video.type}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMedia('videos', idx)}
                                      className="p-1 text-destructive hover:bg-destructive/20 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Music Tab */}
                        {mediaTab === 'music' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Track title"
                                value={musicTitle}
                                onChange={e => setMusicTitle(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Artist (optional)"
                                value={musicArtist}
                                onChange={e => setMusicArtist(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                              />
                            </div>
                            <label className="cursor-pointer">
                              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">Upload Audio (MP3, WAV, OGG - max 50MB)</span>
                              </div>
                              <input
                                type="file"
                                accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3"
                                onChange={handleMusicUpload}
                                className="hidden"
                                disabled={mediaUploading}
                              />
                            </label>
                            {artworkInfo?.musicTracks?.length > 0 && (
                              <div className="space-y-2">
                                {artworkInfo.musicTracks.map((track: { url: string; title?: string; artist?: string }, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                                    <Music className="w-4 h-4 text-muted-foreground" />
                                    <span className="flex-1 text-sm truncate">{track.title || 'Untitled'}</span>
                                    {track.artist && <span className="text-xs text-muted-foreground">{track.artist}</span>}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMedia('music', idx)}
                                      className="p-1 text-destructive hover:bg-destructive/20 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Documents Tab */}
                        {mediaTab === 'documents' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Document title"
                                value={docTitle}
                                onChange={e => setDocTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                              />
                              <input
                                type="text"
                                placeholder="Description (optional)"
                                value={docDescription}
                                onChange={e => setDocDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                              />
                            </div>
                            <label className="cursor-pointer">
                              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">Upload PDF (max 20MB)</span>
                              </div>
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleDocumentUpload}
                                className="hidden"
                                disabled={mediaUploading}
                              />
                            </label>
                            {artworkInfo?.documents?.length > 0 && (
                              <div className="space-y-2">
                                {artworkInfo.documents.map((doc: { url: string; title?: string; description?: string }, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="flex-1 text-sm truncate">{doc.title || 'Untitled'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMedia('documents', idx)}
                                      className="p-1 text-destructive hover:bg-destructive/20 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {mediaUploading && (
                          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 p-6 pt-4 border-t border-border shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1" onClick={handleEditSave}>
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Overlay */}
      <AnimatePresence>
        {isAnalyzing && uploadedImage && (
          <AnalyzingOverlay imageUrl={uploadedImage} currentStep={currentStep} />
        )}
      </AnimatePresence>

      {/* Saving Overlay */}
      <AnimatePresence>
        {isSaving && artworkInfo?.imageUrl && (
          <SavingOverlay imageUrl={getMediaUrl(artworkInfo.imageUrl)} />
        )}
      </AnimatePresence>
    </div>
  );
}

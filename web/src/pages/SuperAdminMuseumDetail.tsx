import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Image,
  Images,
  Search,
  Filter,
  Trash2,
  Eye,
  ImagePlus,
  X,
  User,
  Calendar,
  Palette,
  Play,
  Pause,
  Volume2,
  Languages,
  Pencil,
  Upload,
  Video,
  Music,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  Clock,
  CreditCard,
} from 'lucide-react';
import axios from 'axios';
import { API_BASE, getMediaUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ArtworkItem {
  _id: string;
  title: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  imageUrl?: string;
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
  additionalPhotos?: { url: string; caption?: string }[];
  videos?: { type: string; url: string; embedId?: string; title?: string }[];
  musicTracks?: { url: string; title?: string; artist?: string }[];
  documents?: { url: string; title?: string; description?: string }[];
  externalLinks?: { label: string; url: string }[];
  createdAt: string;
}

interface MuseumInfo {
  _id: string;
  name: string;
  location: string;
  subscription?: {
    plan: string;
    status: string;
    artworkLimit: number;
    trialEndDate?: string;
  };
  isActive?: boolean;
}

const languages = [
  { code: 'en', name: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'fr', name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
];

export default function SuperAdminMuseumDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [museum, setMuseum] = useState<MuseumInfo | null>(null);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<string | null>(null);

  // View modal state
  const [viewingArtwork, setViewingArtwork] = useState<ArtworkItem | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<ArtworkItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    year: '',
    style: '',
    description: '',
    externalLinks: [] as { label: string; url: string }[],
  });
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Subscription management state
  const [actionLoading, setActionLoading] = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  // Media upload state
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos' | 'music' | 'documents'>('photos');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/superadmin/museums/${id}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuseum(res.data.museum);
      setArtworks(res.data.artworks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError((err as any)?.response?.data?.error || message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (artworkId: string) => {
    if (!confirm('Are you sure you want to delete this artwork? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE}/admin/${artworkId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setArtworks(artworks.filter((a) => a._id !== artworkId));
      if (viewingArtwork?._id === artworkId) closeViewModal();
      if (editingArtwork?._id === artworkId) closeEditModal();
    } catch {
      alert('Failed to delete artwork');
    }
  };

  // --- View Modal ---
  const handleView = async (artwork: ArtworkItem) => {
    try {
      const response = await axios.get(`${API_BASE}/visit/artwork/${artwork._id}`);
      setViewingArtwork(response.data.artwork || artwork);
    } catch {
      setViewingArtwork(artwork);
    }
    setIsPlaying(false);
    setSelectedLanguage('en');
  };

  const closeViewModal = () => {
    setViewingArtwork(null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
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
    if (!viewingArtwork) return '';
    const desc = viewingArtwork.descriptions?.[selectedLanguage as keyof typeof viewingArtwork.descriptions];
    return desc || viewingArtwork.description || 'No description available.';
  };

  const getCurrentAudioUrl = () => {
    if (!viewingArtwork?.audioUrls) return null;
    return viewingArtwork.audioUrls[selectedLanguage as keyof typeof viewingArtwork.audioUrls];
  };

  // --- Edit Modal ---
  const openEditModal = async (artwork: ArtworkItem) => {
    // Fetch full details if needed
    let fullArtwork = artwork;
    try {
      const response = await axios.get(`${API_BASE}/visit/artwork/${artwork._id}`);
      fullArtwork = response.data.artwork || artwork;
    } catch {
      // use basic data
    }
    setEditingArtwork(fullArtwork);
    setEditForm({
      title: fullArtwork.title || '',
      author: fullArtwork.author || '',
      year: fullArtwork.year || '',
      style: fullArtwork.style || '',
      description: fullArtwork.description || fullArtwork.descriptions?.en || '',
      externalLinks: fullArtwork.externalLinks || [],
    });
    setNewLink({ label: '', url: '' });
    setMediaExpanded(false);
    setMediaTab('photos');
    setIsEditing(true);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setEditingArtwork(null);
    setMediaExpanded(false);
  };

  const handleAddLink = () => {
    if (newLink.label.trim() && newLink.url.trim()) {
      setEditForm({
        ...editForm,
        externalLinks: [...editForm.externalLinks, { label: newLink.label.trim(), url: newLink.url.trim() }],
      });
      setNewLink({ label: '', url: '' });
    }
  };

  const handleRemoveLink = (index: number) => {
    setEditForm({
      ...editForm,
      externalLinks: editForm.externalLinks.filter((_, i) => i !== index),
    });
  };

  const handleEditSave = async () => {
    if (!editingArtwork?._id) return;
    setIsSaving(true);
    setError('');

    const descriptionToSave = editForm.description || editingArtwork.descriptions?.en || 'Artwork in museum collection.';

    try {
      const response = await axios.post(
        `${API_BASE}/admin/${editingArtwork._id}/finalize`,
        {
          title: editForm.title,
          author: editForm.author,
          year: editForm.year,
          style: editForm.style,
          description: descriptionToSave,
          externalLinks: editForm.externalLinks,
          sourceLanguage: 'en',
        },
        {
          timeout: 180000,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // Update local state
      setArtworks(
        artworks.map((a) =>
          a._id === editingArtwork._id
            ? {
                ...a,
                title: editForm.title,
                author: editForm.author,
                year: editForm.year,
                style: editForm.style,
                description: editForm.description,
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
              }
            : a
        )
      );

      closeEditModal();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Media handlers (for edit modal) ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingArtwork?._id || !e.target.files?.length) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach((file) => formData.append('photos', file));
      const response = await axios.post(`${API_BASE}/admin/${editingArtwork._id}/media/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      });
      setEditingArtwork({ ...editingArtwork, additionalPhotos: response.data.photos });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload photos');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingArtwork?._id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', e.target.files[0]);
      formData.append('title', videoTitle || e.target.files[0].name);
      const response = await axios.post(`${API_BASE}/admin/${editingArtwork._id}/media/videos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      });
      setEditingArtwork({ ...editingArtwork, videos: response.data.videos });
      setVideoTitle('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload video');
    } finally {
      setMediaUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoUrlAdd = async () => {
    if (!editingArtwork?._id || !videoUrl) return;
    setMediaUploading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/admin/${editingArtwork._id}/media/videos`,
        { videoUrl, title: videoTitle },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setEditingArtwork({ ...editingArtwork, videos: response.data.videos });
      setVideoUrl('');
      setVideoTitle('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add video');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingArtwork?._id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('music', e.target.files[0]);
      formData.append('title', musicTitle || e.target.files[0].name);
      formData.append('artist', musicArtist);
      const response = await axios.post(`${API_BASE}/admin/${editingArtwork._id}/media/music`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      });
      setEditingArtwork({ ...editingArtwork, musicTracks: response.data.musicTracks });
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
    if (!editingArtwork?._id || !e.target.files?.[0]) return;
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', e.target.files[0]);
      formData.append('title', docTitle || e.target.files[0].name);
      formData.append('description', docDescription);
      const response = await axios.post(`${API_BASE}/admin/${editingArtwork._id}/media/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token && { Authorization: `Bearer ${token}` }) },
      });
      setEditingArtwork({ ...editingArtwork, documents: response.data.documents });
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
    if (!editingArtwork?._id) return;
    try {
      const response = await axios.delete(`${API_BASE}/admin/${editingArtwork._id}/media/${type}/${index}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const fieldMap: Record<string, string> = {
        photos: 'additionalPhotos',
        videos: 'videos',
        music: 'musicTracks',
        documents: 'documents',
      };
      setEditingArtwork({ ...editingArtwork, [fieldMap[type]]: response.data[fieldMap[type]] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete media');
    }
  };

  // --- Subscription management ---
  const handleToggleActive = async () => {
    if (!museum) return;
    setActionLoading(true);
    try {
      const endpoint = museum.isActive !== false ? 'deactivate' : 'activate';
      await axios.post(`${API_BASE}/superadmin/museums/${id}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuseum({ ...museum, isActive: museum.isActive === false });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update museum');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetTrial = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/superadmin/museums/${id}/set-trial`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuseum(prev => prev ? { ...prev, isActive: true, subscription: res.data.subscription } : null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPlan = async (plan: string) => {
    setActionLoading(true);
    setPlanDropdownOpen(false);
    try {
      const body: any = { plan };
      if (plan === 'custom') {
        const limitStr = prompt('Enter artwork limit:');
        const priceStr = prompt('Enter monthly price ($):');
        if (!limitStr || !priceStr) { setActionLoading(false); return; }
        body.artworkLimit = parseInt(limitStr);
        body.customPrice = parseFloat(priceStr);
      }
      const res = await axios.post(`${API_BASE}/superadmin/museums/${id}/set-plan`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuseum(prev => prev ? { ...prev, subscription: res.data.subscription } : null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set plan');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Filtered artworks ---
  const filteredArtworks = artworks.filter(
    (artwork) =>
      artwork.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artwork.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artwork.style?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            {/* Back button */}
            <button
              onClick={() => navigate('/superadmin/museums')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Museums</span>
            </button>

            <div className="flex items-center justify-between mb-4">
              <div>
                {museum ? (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-3xl text-foreground flex items-center gap-3"
                    >
                      <Images className="w-8 h-8 text-primary" />
                      {museum.name}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-muted-foreground mt-1"
                    >
                      {museum.location} &middot; {artworks.length} artwork{artworks.length !== 1 ? 's' : ''}
                    </motion.p>

                    {/* Subscription Info Panel */}
                    {museum.subscription && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-3 flex flex-wrap items-center gap-3"
                      >
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          museum.isActive === false
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : museum.subscription.status === 'trialing'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : museum.subscription.plan === 'free'
                            ? 'bg-muted text-muted-foreground border-border'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          <CreditCard className="w-3 h-3 inline mr-1" />
                          {museum.isActive === false ? 'Deactivated' : museum.subscription.plan.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {artworks.length}/{museum.subscription.artworkLimit} artworks used
                        </span>
                        {museum.subscription.status === 'trialing' && museum.subscription.trialEndDate && (
                          <span className="text-xs text-blue-500">
                            Trial ends {new Date(museum.subscription.trialEndDate).toLocaleDateString()}
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={handleToggleActive}
                            disabled={actionLoading}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              museum.isActive !== false
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                          >
                            {museum.isActive !== false ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            {museum.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          {museum.subscription.status !== 'trialing' && (
                            <button
                              onClick={handleSetTrial}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                              Set Trial
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              Change Plan
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {planDropdownOpen && (
                              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
                                {['free', 'starter', 'professional', 'custom'].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => handleSetPlan(p)}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors capitalize first:rounded-t-lg last:rounded-b-lg"
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="h-14" />
                )}
              </div>
              <Button variant="gold" onClick={() => navigate(`/superadmin/museums/${id}/upload`)} className="gap-2">
                <ImagePlus className="w-4 h-4" />
                Upload Artwork
              </Button>
            </div>

            {/* Search */}
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
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
              <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-destructive/20 rounded">
                <X className="w-4 h-4 text-destructive" />
              </button>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && artworks.length === 0 && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Images className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">No artworks yet</h3>
              <p className="text-muted-foreground mb-6">Start by uploading the first artwork to this museum</p>
              <Button variant="gold" onClick={() => navigate(`/superadmin/museums/${id}/upload`)} className="gap-2">
                <ImagePlus className="w-4 h-4" />
                Upload Artwork
              </Button>
            </motion.div>
          )}

          {/* Artworks Grid */}
          {!isLoading && filteredArtworks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtworks.map((artwork, index) => (
                <motion.div
                  key={artwork._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer',
                    selectedArtwork === artwork._id && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedArtwork(artwork._id === selectedArtwork ? null : artwork._id)}
                >
                  {/* Image */}
                  <div className="aspect-[4/3] overflow-hidden">
                    {artwork.imageUrl ? (
                      <img
                        src={getMediaUrl(artwork.imageUrl)}
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Image className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-display text-lg text-foreground truncate">{artwork.title || 'Untitled'}</h3>
                    <p className="text-sm text-muted-foreground truncate">{artwork.author || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {artwork.year || 'Unknown'}
                      </span>
                      {artwork.style && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{artwork.style}</span>
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
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(artwork);
                      }}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(artwork._id);
                      }}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* No search results */}
          {!isLoading && artworks.length > 0 && filteredArtworks.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No artworks match "{searchQuery}"</p>
            </div>
          )}
        </div>
      </main>

      {/* ==================== View Modal ==================== */}
      <AnimatePresence>
        {viewingArtwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={closeViewModal}
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
                <button onClick={closeViewModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
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
                          <p className="text-sm font-medium">{viewingArtwork.author || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Year</p>
                          <p className="text-sm font-medium">{viewingArtwork.year || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 col-span-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Style</p>
                          <p className="text-sm font-medium">{viewingArtwork.style || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description & Audio */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-2xl text-foreground mb-1">{viewingArtwork.title}</h3>
                      <p className="text-muted-foreground">
                        {viewingArtwork.author}, {viewingArtwork.year}
                      </p>
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
                              'px-3 py-1.5 rounded-lg text-sm transition-colors',
                              selectedLanguage === lang.code
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 hover:bg-muted'
                            )}
                          >
                            {lang.flag} {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-sm text-foreground leading-relaxed">{getCurrentDescription()}</p>
                    </div>

                    {/* Audio Player */}
                    {getCurrentAudioUrl() ? (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <button
                          onClick={toggleAudio}
                          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Audio Guide ({languages.find((l) => l.code === selectedLanguage)?.name})
                          </p>
                          <p className="text-xs text-muted-foreground">Click to {isPlaying ? 'pause' : 'play'}</p>
                        </div>
                        <Volume2 className="w-5 h-5 text-muted-foreground" />
                        <audio ref={audioRef} src={getMediaUrl(getCurrentAudioUrl())} onEnded={() => setIsPlaying(false)} />
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">No audio guide available for this language</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={closeViewModal}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    closeViewModal();
                    openEditModal(viewingArtwork);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(viewingArtwork._id);
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

      {/* ==================== Edit Modal ==================== */}
      <AnimatePresence>
        {isEditing && editingArtwork && (
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
                <h2 className="font-display text-2xl text-foreground">Edit Artwork</h2>
                <button onClick={closeEditModal} className="p-2 rounded-lg hover:bg-muted transition-colors">
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

                {/* External Links */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">External Links</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Link label"
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
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLink} className="px-3">
                      + Add
                    </Button>
                  </div>
                  {editForm.externalLinks.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {editForm.externalLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
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
                </div>

                {/* Additional Media Section */}
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
                        {(
                          [
                            { id: 'photos' as const, label: 'Photos', icon: Image },
                            { id: 'videos' as const, label: 'Videos', icon: Video },
                            { id: 'music' as const, label: 'Music', icon: Music },
                            { id: 'documents' as const, label: 'Documents', icon: FileText },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setMediaTab(tab.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              mediaTab === tab.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
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
                          {editingArtwork?.additionalPhotos && editingArtwork.additionalPhotos.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {editingArtwork.additionalPhotos.map((photo, idx) => (
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
                          <input
                            type="text"
                            placeholder="Video title (optional)"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="YouTube or Vimeo URL"
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
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
                          {editingArtwork?.videos && editingArtwork.videos.length > 0 && (
                            <div className="space-y-2">
                              {editingArtwork.videos.map((video, idx) => (
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
                              onChange={(e) => setMusicTitle(e.target.value)}
                              className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Artist (optional)"
                              value={musicArtist}
                              onChange={(e) => setMusicArtist(e.target.value)}
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
                          {editingArtwork?.musicTracks && editingArtwork.musicTracks.length > 0 && (
                            <div className="space-y-2">
                              {editingArtwork.musicTracks.map((track, idx) => (
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
                          <input
                            type="text"
                            placeholder="Document title"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={docDescription}
                            onChange={(e) => setDocDescription(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                          />
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
                          {editingArtwork?.documents && editingArtwork.documents.length > 0 && (
                            <div className="space-y-2">
                              {editingArtwork.documents.map((doc, idx) => (
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
              </div>

              <div className="flex items-center gap-4 p-6 pt-4 border-t border-border shrink-0">
                <Button variant="outline" className="flex-1" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1" onClick={handleEditSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, Image } from 'lucide-react';
import axios from 'axios';
import { API_BASE, getMediaUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';

interface ArtworkItem {
  _id: string;
  title: string;
  author?: string;
  year?: string;
  style?: string;
  imageUrl?: string;
  createdAt: string;
}

interface MuseumInfo {
  _id: string;
  name: string;
  location: string;
}

export default function SuperAdminMuseumDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [museum, setMuseum] = useState<MuseumInfo | null>(null);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
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
    fetchData();
  }, [id, token]);

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back button */}
          <button
            onClick={() => navigate('/superadmin/museums')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Museums</span>
          </button>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-6">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : museum ? (
            <>
              <div className="mb-8">
                <h1 className="font-display text-3xl text-foreground mb-2">{museum.name}</h1>
                <p className="text-muted-foreground">{museum.location}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {artworks.length} artwork{artworks.length !== 1 ? 's' : ''}
                </p>
              </div>

              {artworks.length === 0 ? (
                <div className="text-center py-20">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No artworks uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {artworks.map((artwork, i) => (
                    <motion.div
                      key={artwork._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
                    >
                      <div className="aspect-square bg-muted relative">
                        {artwork.imageUrl ? (
                          <img
                            src={getMediaUrl(artwork.imageUrl)}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-10 h-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-foreground truncate">{artwork.title}</h3>
                        {artwork.author && (
                          <p className="text-sm text-muted-foreground truncate">{artwork.author}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {artwork.year && <span>{artwork.year}</span>}
                          {artwork.style && (
                            <>
                              {artwork.year && <span>·</span>}
                              <span>{artwork.style}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}

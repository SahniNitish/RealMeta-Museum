import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Search, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';

interface MuseumItem {
  _id: string;
  name: string;
  location: string;
  website?: string;
  createdAt: string;
  admin: {
    name: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
  } | null;
  artworkCount: number;
}

export default function SuperAdminMuseums() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [museums, setMuseums] = useState<MuseumItem[]>([]);
  const [filtered, setFiltered] = useState<MuseumItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMuseums = async () => {
      try {
        const res = await axios.get(`${API_BASE}/superadmin/museums`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMuseums(res.data);
        setFiltered(res.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load museums';
        setError((err as any)?.response?.data?.error || message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMuseums();
  }, [token]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(museums);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      museums.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.admin?.name.toLowerCase().includes(q) ||
          m.admin?.email.toLowerCase().includes(q)
      )
    );
  }, [search, museums]);

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-foreground mb-2">All Museums</h1>
              <p className="text-muted-foreground">
                {museums.length} museum{museums.length !== 1 ? 's' : ''} registered on the platform
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search museums, admins..."
              className="w-full max-w-md pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

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
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {search ? 'No museums match your search.' : 'No museums registered yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((museum, i) => (
                <motion.button
                  key={museum._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/superadmin/museums/${museum._id}`)}
                  className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg text-foreground mb-1 truncate">{museum.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{museum.location}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {museum.artworkCount} artwork{museum.artworkCount !== 1 ? 's' : ''}
                        </span>
                        {museum.admin && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {museum.admin.isVerified ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {museum.admin.name}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          Joined {new Date(museum.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

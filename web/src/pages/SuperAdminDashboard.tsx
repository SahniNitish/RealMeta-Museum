import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Image, Users, Eye, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';

interface Stats {
  totalMuseums: number;
  totalArtworks: number;
  totalAdmins: number;
  totalVisitors: number;
}

interface MuseumItem {
  _id: string;
  name: string;
  location: string;
  createdAt: string;
  admin: { name: string; email: string } | null;
  artworkCount: number;
}

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentMuseums, setRecentMuseums] = useState<MuseumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, museumsRes] = await Promise.all([
          axios.get(`${API_BASE}/superadmin/stats`, { headers }),
          axios.get(`${API_BASE}/superadmin/museums`, { headers }),
        ]);
        setStats(statsRes.data);
        setRecentMuseums(museumsRes.data.slice(0, 5));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError((err as any)?.response?.data?.error || message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const statCards = stats
    ? [
        { label: 'Total Museums', value: stats.totalMuseums, icon: Building2, color: 'text-blue-500' },
        { label: 'Total Artworks', value: stats.totalArtworks, icon: Image, color: 'text-emerald-500' },
        { label: 'Total Admins', value: stats.totalAdmins, icon: Users, color: 'text-amber-500' },
        { label: 'Total Visitors', value: stats.totalVisitors, icon: Eye, color: 'text-purple-500' },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl text-foreground mb-2">Platform Overview</h1>
          <p className="text-muted-foreground mb-8">Manage all museums and content across the RealMeta platform.</p>

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
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {statCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-card"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <card.icon className={`w-8 h-8 ${card.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Recent Museums */}
              <div className="bg-card border border-border rounded-2xl shadow-card">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h2 className="font-display text-xl text-foreground">Recent Museums</h2>
                  <button
                    onClick={() => navigate('/superadmin/museums')}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {recentMuseums.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No museums registered yet.</div>
                  ) : (
                    recentMuseums.map((museum) => (
                      <button
                        key={museum._id}
                        onClick={() => navigate(`/superadmin/museums/${museum._id}`)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{museum.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{museum.location}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-foreground">{museum.artworkCount} artworks</p>
                          <p className="text-xs text-muted-foreground">
                            {museum.admin?.name || 'No admin'}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

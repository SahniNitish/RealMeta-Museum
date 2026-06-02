import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Clock,
  Filter,
} from 'lucide-react';
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
  subscription: {
    plan: string;
    status: string;
    artworkLimit: number;
    trialEndDate?: string;
  };
  isActive: boolean;
}

type FilterType = 'all' | 'active' | 'trial' | 'free' | 'deactivated';

function getStatusBadge(museum: MuseumItem) {
  if (!museum.isActive) {
    return { label: 'Deactivated', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
  }
  if (museum.subscription.status === 'trialing' && museum.subscription.trialEndDate) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(museum.subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    return { label: `Trial (${daysLeft}d left)`, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
  }
  if (museum.subscription.status === 'past_due') {
    return { label: 'Past Due', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  }
  if (museum.subscription.plan === 'free') {
    return { label: 'Free', color: 'bg-muted text-muted-foreground border-border' };
  }
  return {
    label: museum.subscription.plan.charAt(0).toUpperCase() + museum.subscription.plan.slice(1),
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };
}

export default function SuperAdminMuseums() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [museums, setMuseums] = useState<MuseumItem[]>([]);
  const [filtered, setFiltered] = useState<MuseumItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMuseums();
  }, [token]);

  const fetchMuseums = async () => {
    try {
      const res = await axios.get(`${API_BASE}/superadmin/museums`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuseums(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load museums';
      setError((err as any)?.response?.data?.error || message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = museums;

    // Apply filter
    if (filter === 'active') {
      result = result.filter(
        (m) => m.isActive && m.subscription.plan !== 'free' && m.subscription.status !== 'trialing'
      );
    } else if (filter === 'trial') {
      result = result.filter((m) => m.subscription.status === 'trialing');
    } else if (filter === 'free') {
      result = result.filter((m) => m.subscription.plan === 'free' && m.isActive);
    } else if (filter === 'deactivated') {
      result = result.filter((m) => !m.isActive);
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.admin?.name.toLowerCase().includes(q) ||
          m.admin?.email.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, filter, museums]);

  const handleToggleActive = async (museumId: string, currentlyActive: boolean) => {
    setActionLoading(museumId);
    try {
      const endpoint = currentlyActive ? 'deactivate' : 'activate';
      await axios.post(
        `${API_BASE}/superadmin/museums/${museumId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMuseums(
        museums.map((m) => (m._id === museumId ? { ...m, isActive: !currentlyActive } : m))
      );
    } catch (err) {
      setError((err as any)?.response?.data?.error || 'Failed to update museum');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetTrial = async (museumId: string) => {
    setActionLoading(museumId);
    try {
      const res = await axios.post(
        `${API_BASE}/superadmin/museums/${museumId}/set-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMuseums(
        museums.map((m) =>
          m._id === museumId
            ? { ...m, isActive: true, subscription: res.data.subscription }
            : m
        )
      );
    } catch (err) {
      setError((err as any)?.response?.data?.error || 'Failed to set trial');
    } finally {
      setActionLoading(null);
    }
  };

  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Paid' },
    { id: 'trial', label: 'Trial' },
    { id: 'free', label: 'Free' },
    { id: 'deactivated', label: 'Deactivated' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl text-foreground mb-2">All Museums</h1>
              <p className="text-muted-foreground">
                {museums.length} museum{museums.length !== 1 ? 's' : ''} registered on the platform
              </p>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search museums, admins..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
              {search || filter !== 'all'
                ? 'No museums match your criteria.'
                : 'No museums registered yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((museum, i) => {
                const badge = getStatusBadge(museum);
                return (
                  <motion.div
                    key={museum._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => navigate(`/superadmin/museums/${museum._id}`)}
                        className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
                      >
                        <Building2 className="w-6 h-6 text-primary" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/superadmin/museums/${museum._id}`)}
                          className="text-left"
                        >
                          <h3 className="font-display text-lg text-foreground mb-1 truncate hover:text-primary transition-colors">
                            {museum.name}
                          </h3>
                        </button>
                        <p className="text-sm text-muted-foreground truncate">{museum.location}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          {/* Status badge */}
                          <span
                            className={`px-2 py-1 rounded-full border font-medium ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            {museum.artworkCount}/{museum.subscription.artworkLimit} artworks
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
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(museum._id, museum.isActive)}
                            disabled={actionLoading === museum._id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              museum.isActive
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                          >
                            {actionLoading === museum._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : museum.isActive ? (
                              <ShieldOff className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            {museum.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {museum.subscription.status !== 'trialing' && (
                            <button
                              onClick={() => handleSetTrial(museum._id)}
                              disabled={actionLoading === museum._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                              Set Trial
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

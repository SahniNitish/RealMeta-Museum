import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Images,
  Users,
  TrendingUp,
  ImagePlus,
  QrCode,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { API_BASE, getMediaUrl } from "@/lib/api";

interface Stats {
  totalArtworks: number;
  museumName: string;
  museumLocation: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [, setLoading] = useState(true);
  const [recentArtworks, setRecentArtworks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const museumsRes = await axios.get(`${API_BASE}/museums`);
      const museums = museumsRes.data.museums || [];

      if (museums.length > 0) {
        const museum = museums[0];
        const artworksRes = await axios.get(`${API_BASE}/museums/${museum._id}/artworks`);
        const artworks = artworksRes.data.artworks || [];

        setStats({
          totalArtworks: artworks.length,
          museumName: museum.name,
          museumLocation: museum.location,
        });
        setRecentArtworks(artworks.slice(0, 4));
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Images,
      label: "Total Artworks",
      value: stats?.totalArtworks || 0,
      color: "from-primary to-accent",
    },
    {
      icon: Users,
      label: "Visitor Scans",
      value: "Coming Soon",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      label: "This Week",
      value: "Coming Soon",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl text-foreground flex items-center gap-3"
            >
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Dashboard
            </motion.h1>
            {stats && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground mt-1"
              >
                {stats.museumName} - {stats.museumLocation}
              </motion.p>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-display text-foreground mb-1">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl text-foreground">Upload Artwork</h3>
                  <p className="text-muted-foreground text-sm">Add new artwork with AI analysis</p>
                </div>
              </div>
              <Button variant="gold" onClick={() => navigate("/admin/upload")} className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Start Upload
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-xl text-foreground">QR Codes</h3>
                  <p className="text-muted-foreground text-sm">Generate and manage museum QR codes</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate("/admin/qr-codes")} className="w-full gap-2">
                Manage QR Codes
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </motion.div>

          {/* Recent Artworks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-foreground">Recent Artworks</h2>
              <Button variant="ghost" onClick={() => navigate("/admin/collection")} className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {recentArtworks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentArtworks.map((artwork, index) => (
                  <motion.div
                    key={artwork._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/admin/collection")}
                  >
                    <div className="aspect-square">
                      <img
                        src={getMediaUrl(artwork.imageUrl)}
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-sm font-medium text-foreground truncate">{artwork.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{artwork.author}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-muted-foreground">No artworks yet. Start by uploading your first artwork!</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

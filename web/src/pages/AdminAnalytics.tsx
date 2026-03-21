import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  BarChart3,
  Images,
  Users,
  TrendingUp,
  Activity,
  Calendar,
  Info,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Artwork {
  _id: string;
  title: string;
  style?: string;
  createdAt: string;
}

export default function AdminAnalytics() {
  const { museum } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (museum?.id) fetchData();
  }, [museum?.id]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/museums/${museum!.id}/artworks`);
      setArtworks(res.data.artworks || []);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Style distribution
  const styleCounts = artworks.reduce<Record<string, number>>((acc, art) => {
    const style = art.style?.trim() || "Unknown";
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {});
  const styleEntries = Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCount = Math.max(...styleEntries.map(([, v]) => v), 1);

  // Recent uploads (last 5)
  const recentUploads = [...artworks]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // Weekly uploads
  const weeklyCount = artworks.filter((a) => {
    const d = new Date(a.createdAt);
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const statCards = [
    {
      icon: Images,
      label: "Total Artworks",
      value: loading ? "..." : artworks.length,
      color: "from-primary to-accent",
      live: true,
    },
    {
      icon: Users,
      label: "Visitor Scans",
      value: "—",
      color: "from-blue-500 to-cyan-500",
      live: false,
    },
    {
      icon: TrendingUp,
      label: "This Week",
      value: loading ? "..." : weeklyCount,
      color: "from-green-500 to-emerald-500",
      live: true,
    },
    {
      icon: Activity,
      label: "Avg. Session",
      value: "—",
      color: "from-purple-500 to-pink-500",
      live: false,
    },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl text-foreground flex items-center gap-3"
            >
              <BarChart3 className="w-8 h-8 text-primary" />
              Analytics
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {museum?.name} — Collection insights and visitor trends
            </motion.p>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Info banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground"
          >
            <Info className="w-4 h-4 text-primary shrink-0" />
            Artwork data is live. Visitor scan metrics require backend visitor
            tracking (coming soon).
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-display text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Artworks by Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="font-display text-xl text-foreground mb-6">
              Artworks by Style
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : styleEntries.length > 0 ? (
              <div className="space-y-4">
                {styleEntries.map(([style, count], i) => (
                  <div key={style} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">
                        {style}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {count} artwork{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{
                          duration: 0.8,
                          ease: "easeOut",
                          delay: 0.4 + i * 0.05,
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No artworks uploaded yet.
              </p>
            )}
          </motion.div>

          {/* Trend summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                label: "Uploads This Week",
                value: loading ? "..." : weeklyCount,
                unit: "artworks",
              },
              { label: "Monthly Scans", value: "—", unit: "coming soon" },
              { label: "Most Popular Hour", value: "—", unit: "coming soon" },
            ].map((card) => (
              <div
                key={card.label}
                className="p-5 rounded-2xl bg-muted/20 border border-border"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {card.label}
                </div>
                <p className="text-3xl font-display text-foreground">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.unit}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Recent uploads timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="font-display text-xl text-foreground mb-5">
              Recent Uploads
            </h2>

            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : recentUploads.length > 0 ? (
              <div className="space-y-0">
                {recentUploads.map((artwork, i) => (
                  <motion.div
                    key={artwork._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.06 }}
                    className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {artwork.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {artwork.style || "Unknown style"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {new Date(artwork.createdAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No artworks uploaded yet.
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

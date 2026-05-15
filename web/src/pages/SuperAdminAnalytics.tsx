import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, CalendarDays, TrendingUp, Globe, Loader2, AlertCircle, Building2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German', zh: 'Chinese',
  ja: 'Japanese', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ne: 'Nepali',
  ko: 'Korean', tr: 'Turkish', pl: 'Polish', sv: 'Swedish', nl: 'Dutch',
};

interface Analytics {
  totalVisitors: number;
  todayVisitors: number;
  weekVisitors: number;
  monthVisitors: number;
  visitorsPerMuseum: { _id: string; count: number; museumName: string }[];
  languageBreakdown: { _id: string; count: number }[];
  dailyVisitors: { date: string; count: number }[];
}

export default function SuperAdminAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_BASE}/superadmin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load analytics';
        setError((err as any)?.response?.data?.error || message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [token]);

  // Find max for bar chart scaling
  const maxDaily = data ? Math.max(...data.dailyVisitors.map((d) => d.count), 1) : 1;

  const summaryCards = data
    ? [
        { label: 'Today', value: data.todayVisitors, icon: Eye, color: 'text-blue-500' },
        { label: 'This Week', value: data.weekVisitors, icon: CalendarDays, color: 'text-emerald-500' },
        { label: 'This Month', value: data.monthVisitors, icon: TrendingUp, color: 'text-amber-500' },
        { label: 'All Time', value: data.totalVisitors, icon: Globe, color: 'text-purple-500' },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground mb-8">Visitor activity across the platform.</p>

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
          ) : data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {summaryCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6 shadow-card"
                  >
                    <card.icon className={`w-7 h-7 ${card.color} mb-3`} />
                    <p className="text-3xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Daily Chart (last 14 days) */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card mb-8">
                <h2 className="font-display text-lg text-foreground mb-6">Daily Visitors (Last 14 Days)</h2>
                <div className="flex items-end gap-2 h-48">
                  {data.dailyVisitors.map((day) => {
                    const pct = (day.count / maxDaily) * 100;
                    const d = new Date(day.date + 'T00:00:00');
                    const label = `${d.getMonth() + 1}/${d.getDate()}`;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {day.count > 0 ? day.count : ''}
                        </span>
                        <div
                          className="w-full bg-primary/80 rounded-t-md transition-all min-h-[4px]"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Museums */}
                <div className="bg-card border border-border rounded-2xl shadow-card">
                  <div className="p-6 border-b border-border">
                    <h2 className="font-display text-lg text-foreground">Top Museums by Visitors</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {data.visitorsPerMuseum.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">No visitor data yet.</div>
                    ) : (
                      data.visitorsPerMuseum.map((m, i) => (
                        <div key={m._id} className="flex items-center gap-4 p-4">
                          <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate text-sm">{m.museumName}</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{m.count.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Language Breakdown */}
                <div className="bg-card border border-border rounded-2xl shadow-card">
                  <div className="p-6 border-b border-border">
                    <h2 className="font-display text-lg text-foreground">Visitor Languages</h2>
                  </div>
                  <div className="p-6">
                    {data.languageBreakdown.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm">No visitor data yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {data.languageBreakdown.map((lang) => {
                          const pct = data.totalVisitors > 0
                            ? Math.round((lang.count / data.totalVisitors) * 100)
                            : 0;
                          return (
                            <div key={lang._id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground">
                                  {LANGUAGE_NAMES[lang._id] || lang._id}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {lang.count.toLocaleString()} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}

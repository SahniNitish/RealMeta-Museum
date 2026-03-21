import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  UserCircle,
  MapPin,
  Building2,
  QrCode,
  Edit3,
  Check,
  X,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminProfile() {
  const { admin, museum } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [museumName, setMuseumName] = useState(museum?.name || "");
  const [museumLocation, setMuseumLocation] = useState(museum?.location || "");
  const [museumDescription, setMuseumDescription] = useState("");

  const handleSave = async () => {
    if (!museum?.id) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/museums/${museum.id}`,
        { name: museumName, location: museumLocation, description: museumDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setMuseumName(museum?.name || "");
    setMuseumLocation(museum?.location || "");
    setMuseumDescription("");
    setEditing(false);
    setError(null);
  };

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
              <UserCircle className="w-8 h-8 text-primary" />
              My Profile
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Account details and museum information
            </motion.p>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-2xl">
          {/* Admin card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center shrink-0">
                <span className="font-display text-3xl text-primary">
                  {admin?.name ? getInitials(admin.name) : "AD"}
                </span>
              </div>
              <div>
                <h2 className="font-display text-2xl text-foreground">
                  {admin?.name || "Admin"}
                </h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {admin?.email}
                </p>
                <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  {admin?.role || "Admin"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Museum details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Museum Details
              </h2>
              {!editing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive mb-4">{error}</p>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Building2 className="w-3 h-3" />
                  Museum Name
                </label>
                {editing ? (
                  <input
                    value={museumName}
                    onChange={(e) => setMuseumName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                ) : (
                  <p className="text-foreground">{museum?.name || "—"}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  Location
                </label>
                {editing ? (
                  <input
                    value={museumLocation}
                    onChange={(e) => setMuseumLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                ) : (
                  <p className="text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {museum?.location || "—"}
                  </p>
                )}
              </div>

              {editing && (
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <FileText className="w-3 h-3" />
                    Description (optional)
                  </label>
                  <textarea
                    value={museumDescription}
                    onChange={(e) => setMuseumDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief museum description..."
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-card border border-border"
          >
            <h2 className="font-display text-xl text-foreground flex items-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-primary" />
              Museum QR Code
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Visitors scan this QR code to access the AI museum guide.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/qr-codes")}
              className="gap-2"
            >
              <QrCode className="w-4 h-4" />
              Manage QR Codes
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

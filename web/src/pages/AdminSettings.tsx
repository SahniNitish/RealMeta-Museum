import { useState } from "react";
import { motion } from "framer-motion";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  Settings,
  Moon,
  Sun,
  Globe,
  Bell,
  User,
  KeyRound,
  Monitor,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const UI_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme();
  const { admin, museum } = useAuth();

  const [uiLanguage, setUiLanguage] = useState(
    () => localStorage.getItem("ui_language") || "en"
  );
  const [emailNotifs, setEmailNotifs] = useState(
    () => localStorage.getItem("email_notifs") !== "false"
  );
  const [visitNotifs, setVisitNotifs] = useState(
    () => localStorage.getItem("visit_notifs") !== "false"
  );

  const handleLanguageChange = (code: string) => {
    setUiLanguage(code);
    localStorage.setItem("ui_language", code);
  };

  const toggleEmailNotifs = () => {
    const next = !emailNotifs;
    setEmailNotifs(next);
    localStorage.setItem("email_notifs", String(next));
  };

  const toggleVisitNotifs = () => {
    const next = !visitNotifs;
    setVisitNotifs(next);
    localStorage.setItem("visit_notifs", String(next));
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
              <Settings className="w-8 h-8 text-primary" />
              Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Manage your preferences and account settings
            </motion.p>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-2xl">
          {/* Appearance */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border space-y-5"
          >
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Appearance
            </h2>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {theme} mode
                  </p>
                </div>
              </div>
              <Toggle on={theme === "dark"} onToggle={toggleTheme} />
            </div>
          </motion.section>

          {/* Language */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border space-y-4"
          >
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Language
            </h2>

            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Admin interface language
              </p>
              <div className="flex gap-3 flex-wrap">
                {UI_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      uiLanguage === lang.code
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Visitor audio guides have their own language setting on the
                visitor page.
              </p>
            </div>
          </motion.section>

          {/* Notifications */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-card border border-border space-y-5"
          >
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Email Notifications
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Toggle on={emailNotifs} onToggle={toggleEmailNotifs} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Visitor Activity
                </p>
                <p className="text-xs text-muted-foreground">
                  Notify when visitors scan artworks
                </p>
              </div>
              <Toggle on={visitNotifs} onToggle={toggleVisitNotifs} />
            </div>

            <p className="text-xs text-muted-foreground pt-1 border-t border-border">
              Email notifications require backend configuration. Preferences are
              saved locally.
            </p>
          </motion.section>

          {/* Account */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-card border border-border space-y-5"
          >
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account
            </h2>

            <div className="space-y-3">
              {[
                { label: "Name", value: admin?.name },
                { label: "Email", value: admin?.email },
                { label: "Museum", value: museum?.name },
                { label: "Location", value: museum?.location },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm text-foreground">{value || "—"}</span>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50 transition-colors text-sm">
              <KeyRound className="w-4 h-4" />
              Change Password (Coming Soon)
            </button>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function EmailVerificationBanner() {
  const { admin, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show if admin is loaded and NOT verified
  if (!admin || admin.isVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      await resendVerification();
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send. Try again shortly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full bg-primary/10 border-b border-primary/20 px-6 py-3"
      >
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <Mail className="w-4 h-4 text-primary shrink-0" />

          <p className="text-sm text-foreground flex-1">
            <span className="font-medium">Verify your email</span>
            {" — "}
            <span className="text-muted-foreground">
              Check your inbox at{" "}
              <span className="text-foreground">{admin.email}</span> for a
              verification link.
            </span>
          </p>

          {!sent ? (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50 shrink-0 flex items-center gap-1"
            >
              {sending && <Loader2 className="w-3 h-3 animate-spin" />}
              {sending ? "Sending..." : "Resend email"}
            </button>
          ) : (
            <span className="text-xs text-green-500 flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" />
              Sent!
            </span>
          )}

          {error && (
            <span className="text-xs text-destructive shrink-0">{error}</span>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

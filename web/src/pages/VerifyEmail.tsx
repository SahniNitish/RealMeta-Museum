import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }
    verify(token);
  }, []);

  const verify = async (token: string) => {
    try {
      const res = await axios.get(`${API_BASE}/auth/verify-email`, {
        params: { token },
      });
      setMessage(res.data.message || "Email verified successfully!");
      setStatus("success");
    } catch (err: any) {
      setMessage(
        err.response?.data?.error || "Invalid or expired verification link."
      );
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 shadow-glow">
          <span className="text-primary-foreground font-display font-bold text-3xl">
            R
          </span>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="font-display text-2xl text-foreground mb-2">
              Verifying your email...
            </h1>
            <p className="text-muted-foreground">Just a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-10 h-10 text-green-500" />
            </motion.div>
            <h1 className="font-display text-2xl text-foreground mb-2">
              Email Verified!
            </h1>
            <p className="text-muted-foreground mb-8">{message}</p>
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => navigate("/admin")}
            >
              Go to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
            >
              <XCircle className="w-10 h-10 text-destructive" />
            </motion.div>
            <h1 className="font-display text-2xl text-foreground mb-2">
              Verification Failed
            </h1>
            <p className="text-muted-foreground mb-8">{message}</p>
            <div className="flex flex-col gap-3">
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={() => navigate("/admin")}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate("/admin/login")}
              >
                Back to Login
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

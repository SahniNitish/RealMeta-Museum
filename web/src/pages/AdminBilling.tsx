import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  CreditCard,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  Crown,
  Sparkles,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { API_BASE } from "@/lib/api";

interface SubscriptionInfo {
  plan: string;
  status: string;
  artworkLimit: number;
  artworkCount: number;
  trialEndDate: string | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
}

const PLAN_CARDS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Zap,
    features: ["5 artworks", "AI artwork analysis", "QR code generation", "Basic analytics"],
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$19.99",
    period: "/month",
    icon: Sparkles,
    features: ["100 artworks", "AI artwork analysis", "QR code generation", "Full analytics", "Priority support"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    popular: true,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49.99",
    period: "/month",
    icon: Crown,
    features: [
      "250 artworks",
      "AI artwork analysis",
      "QR code generation",
      "Full analytics",
      "Priority support",
      "Multi-language audio guides",
      "Custom branding",
    ],
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
];

export default function AdminBilling() {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, [token]);

  // Check for success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      // Refresh subscription data after successful checkout
      fetchSubscription();
      // Clean URL
      window.history.replaceState({}, "", "/admin/billing");
    }
    if (params.get("canceled") === "true") {
      window.history.replaceState({}, "", "/admin/billing");
    }
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await axios.get(`${API_BASE}/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(res.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load subscription";
      setError((err as any)?.response?.data?.error || message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    if (!token || plan === "free") return;
    setUpgrading(plan);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/billing/create-checkout-session`,
        { plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      setError((err as any)?.response?.data?.error || message);
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/billing/create-portal-session`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      setError((err as any)?.response?.data?.error || message);
    }
  };

  const usagePercent = subscription
    ? Math.min((subscription.artworkCount / subscription.artworkLimit) * 100, 100)
    : 0;

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
              <CreditCard className="w-8 h-8 text-primary" />
              Billing & Plans
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Manage your subscription and view usage
            </motion.p>
          </div>
        </header>

        <div className="p-8 max-w-5xl">
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
          ) : subscription ? (
            <>
              {/* Current Usage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-card border border-border mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-xl text-foreground">Current Plan</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      <span className="capitalize font-medium text-foreground">{subscription.plan}</span>
                      {subscription.status === "trialing" && subscription.trialEndDate && (
                        <span className="ml-2 text-blue-500">
                          Trial ends {new Date(subscription.trialEndDate).toLocaleDateString()}
                        </span>
                      )}
                      {subscription.cancelAtPeriodEnd && (
                        <span className="ml-2 text-amber-500">Cancels at period end</span>
                      )}
                    </p>
                  </div>
                  {subscription.plan !== "free" && (
                    <button
                      onClick={handleManageBilling}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Manage Billing
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Artwork Usage</span>
                    <span className="font-medium text-foreground">
                      {subscription.artworkCount} / {subscription.artworkLimit}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePercent >= 90 ? "bg-destructive" : usagePercent >= 70 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  {usagePercent >= 90 && (
                    <p className="text-xs text-destructive">
                      You're approaching your artwork limit. Consider upgrading for more capacity.
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Plan Cards */}
              <h2 className="font-display text-xl text-foreground mb-4">Choose a Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {PLAN_CARDS.map((plan, i) => {
                  const isCurrent = subscription.plan === plan.id;
                  const isDowngrade =
                    (subscription.plan === "professional" && plan.id === "starter") ||
                    (subscription.plan !== "free" && plan.id === "free");

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative p-6 rounded-2xl border-2 transition-all ${
                        isCurrent
                          ? `${plan.borderColor} ${plan.bgColor}`
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      {plan.popular && !isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                          Most Popular
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                          Current Plan
                        </div>
                      )}

                      <div className="mb-4">
                        <plan.icon className={`w-8 h-8 ${plan.color} mb-3`} />
                        <h3 className="font-display text-xl text-foreground">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                            <Check className={`w-4 h-4 ${plan.color} shrink-0`} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <div className="w-full py-3 rounded-xl bg-muted/50 text-center text-sm font-medium text-muted-foreground">
                          Current Plan
                        </div>
                      ) : isDowngrade ? (
                        <button
                          onClick={handleManageBilling}
                          className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                          Manage Plan
                        </button>
                      ) : plan.id !== "free" ? (
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={!!upgrading}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {upgrading === plan.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Upgrade
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              {/* Custom Plan CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 text-center"
              >
                <h3 className="font-display text-lg text-foreground mb-2">Need a Custom Plan?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Contact us for custom artwork limits, dedicated support, and enterprise features.
                </p>
                <a
                  href="mailto:support@realmeta.ca"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const PLAN_ORDER = ["starter", "growth", "scale"];
const SUPPORT_LABELS = { email: "Email", priority_email: "Priority Email", dedicated_slack: "Dedicated Slack" };

export default function OnboardingPlan() {
  const { isAuthenticated, loading: authLoading, refreshVendor } = useAuth();
  const router = useRouter();

  const [pricing, setPricing] = useState({ local: false, plans: {} });
  const [loading, setLoading] = useState(true);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [currency, setCurrency] = useState("usd");
  const [method, setMethod] = useState("ecocash");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(""); // "", "prompting", "success", "failed", "error"
  const [error, setError] = useState("");
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.pesepayPlans()
      .then(setPricing)
      .catch((err) => console.error("Failed to load pricing:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const displayPlans = PLAN_ORDER
    .map((id) => (pricing.plans[id] ? { id, ...pricing.plans[id] } : null))
    .filter(Boolean);

  const skipForNow = () => router.push("/dashboard");

  const handleCheckout = async (planId) => {
    if (!/^0\d{9}$/.test(phone)) {
      setError("Enter a valid phone number, e.g. 0771234567");
      return;
    }
    setError("");
    setStatus("prompting");
    try {
      const { referenceNumber } = await api.pesepayCheckout(planId, phone, currency, method);
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { transactionStatus } = await api.pesepayStatus(referenceNumber);
        if (transactionStatus === "SUCCESS") {
          setStatus("success");
          await refreshVendor();
          return;
        }
        if (transactionStatus === "FAILED") {
          setStatus("failed");
          return;
        }
      }
      setStatus("error");
      setError("Timed out waiting for confirmation. If you approved the PIN prompt, check your dashboard in a minute.");
    } catch (err) {
      console.error("Onboarding checkout failed:", err);
      setStatus("error");
      setError(err.message || "Payment failed to start.");
    }
  };

  const handleCardCheckout = async (planId) => {
    setCardLoading(true);
    try {
      const { redirectUrl } = await api.pesepayCheckoutCard(planId);
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Onboarding card checkout failed:", err);
      alert(err.message || "Failed to start card payment.");
      setCardLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-on-surface-variant animate-spin mr-2">sync</span>
        <span className="text-sm text-on-surface-variant">Loading plans...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-margin-mobile md:px-margin-desktop py-16">
      <div className="max-w-container-max mx-auto">
        <div className="text-center mb-12">
          <p className="font-label-md text-label-md text-primary mb-2">Step 2 of 2</p>
          <h1 className="font-display text-headline-lg text-on-surface mb-3">Choose a plan, or start on your free trial</h1>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            You already have a 14-day free trial active — no payment required. Activate a plan now if you're ready, or skip and decide later from Settings.
          </p>
        </div>

        {status === "success" ? (
          <div className="max-w-md mx-auto text-center bg-surface-container border border-primary/30 rounded-2xl p-10">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">check_circle</span>
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">Plan activated</h2>
            <p className="text-sm text-on-surface-variant mb-6">Your payment was confirmed and your plan is live.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-primary text-on-primary rounded-xl text-sm font-bold py-3 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {displayPlans.map((plan) => (
                <div key={plan.id} className="bg-surface-container border border-outline-variant rounded-2xl p-6 flex flex-col">
                  <h3 className="font-display font-bold text-on-surface text-lg">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="font-display text-3xl font-bold text-on-surface">${plan.price}</span>
                    <span className="text-xs text-on-surface-variant">/mo</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">{pricing.local ? "Zimbabwe pricing" : "International pricing"}</p>
                  <ul className="space-y-2 mb-6 flex-grow">
                    <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {plan.conversationsPerMonth.toLocaleString()} credits/mo
                    </li>
                    <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {plan.chatbots === -1 ? "Unlimited" : plan.chatbots} bot{plan.chatbots === 1 ? "" : "s"}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {SUPPORT_LABELS[plan.support] || plan.support} support
                    </li>
                  </ul>

                  {selectedPlanId !== plan.id ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setSelectedPlanId(plan.id); setStatus(""); setError(""); setMethod("ecocash"); }}
                        className="w-full py-2.5 border border-outline-variant bg-surface-container-lowest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all"
                      >
                        Pay via Ecocash or Omari
                      </button>
                      <button
                        onClick={() => handleCardCheckout(plan.id)}
                        disabled={cardLoading}
                        className="w-full py-2 text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {cardLoading ? "Redirecting…" : "Or pay another way (card, Zimswitch, Innbucks & more)"}
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-outline-variant space-y-2">
                      {status === "prompting" ? (
                        <p className="text-[11px] text-on-surface-variant">Check your phone and enter your PIN to confirm…</p>
                      ) : (
                        <>
                          <div className="flex gap-1 p-0.5 bg-surface-container-lowest border border-outline-variant rounded-lg">
                            {["usd", "zig"].map((c) => (
                              <button
                                key={c}
                                onClick={() => { setCurrency(c); if (c !== "usd") setMethod("ecocash"); }}
                                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${currency === c ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                              >
                                {c === "usd" ? `USD $${plan.price}` : "ZiG"}
                              </button>
                            ))}
                          </div>
                          {currency === "usd" && (
                            <div className="flex gap-1 p-0.5 bg-surface-container-lowest border border-outline-variant rounded-lg">
                              {["ecocash", "omari"].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => setMethod(m)}
                                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all ${method === m ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0771234567"
                            className="w-full bg-surface-container-lowest border border-outline-variant p-2 rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/50"
                          />
                          <button
                            onClick={() => handleCheckout(plan.id)}
                            className="w-full py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                          >
                            Pay with {method === "omari" ? "Omari" : "Ecocash"}
                          </button>
                        </>
                      )}
                      {error && <p className="text-[11px] text-error">{error}</p>}
                      {status === "failed" && (
                        <button onClick={() => setStatus("")} className="text-[11px] text-primary font-semibold">Try again</button>
                      )}
                      <button onClick={() => setSelectedPlanId(null)} className="text-[11px] text-on-surface-variant hover:text-on-surface">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <button onClick={skipForNow} className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Skip for now — continue with my free trial
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

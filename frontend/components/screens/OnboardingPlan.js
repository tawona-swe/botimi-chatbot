"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import PaymentModal from "../ui/PaymentModal";

const PLAN_ORDER = ["starter", "growth", "scale"];
const SUPPORT_LABELS = { email: "Email", priority_email: "Priority Email", dedicated_slack: "Dedicated Slack" };

export default function OnboardingPlan() {
  const { isAuthenticated, loading: authLoading, refreshVendor } = useAuth();
  const router = useRouter();

  const [pricing, setPricing] = useState({ local: false, plans: {} });
  const [loading, setLoading] = useState(true);

  const [checkoutItem, setCheckoutItem] = useState(null);
  // Set once a plan payment succeeds -- lets the modal's own "Done" button
  // send the visitor on to the dashboard instead of just closing the modal
  // back onto this plan-picker screen.
  const [activated, setActivated] = useState(false);

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

  // !isAuthenticated is checked here too, not just authLoading -- otherwise
  // once the auth check resolves for a logged-out visitor, this guard stops
  // blocking and the real plan-selection content flashes before the
  // redirect effect above actually fires.
  if (authLoading || !isAuthenticated || loading) {
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
          <h1 className="font-display text-headline-lg text-on-surface mb-3">Choose a plan</h1>
          <p className="text-on-surface-variant max-w-xl mx-auto">
            You already have a 14-day free trial active — no payment required. Activate a plan now if you're ready, or decide later from Settings.
          </p>
        </div>

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

              <button
                onClick={() => setCheckoutItem({ type: "plan", id: plan.id, name: plan.name, price: plan.price, cardPrice: plan.cardPrice })}
                className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={skipForNow} className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Skip for now — continue with my free trial
          </button>
        </div>
      </div>

      <PaymentModal
        item={checkoutItem}
        itemType="plan"
        onClose={() => {
          setCheckoutItem(null);
          if (activated) router.push("/dashboard");
        }}
        onSuccess={async () => {
          setActivated(true);
          await refreshVendor();
        }}
      />
    </main>
  );
}

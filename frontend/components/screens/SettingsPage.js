"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const PLANS = [
  { id: "starter", name: "Starter", price: 29, chatbots: 1, websites: 1, convos: "500/mo", crawlerPages: 50, support: "Email" },
  { id: "growth", name: "Growth", price: 79, chatbots: 5, websites: 5, convos: "3,000/mo", crawlerPages: 500, support: "Priority Email" },
  { id: "scale", name: "Scale", price: 199, chatbots: "Unlimited", websites: "Unlimited", convos: "15,000/mo", crawlerPages: "Unlimited", support: "Dedicated Slack" },
];

export default function SettingsPage() {
  const { vendor, refreshVendor, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    industry: "",
    country: "",
    brand_color: "#c0c1ff",
  });

  useEffect(() => {
    const saved = localStorage.getItem("botimiSidebarCollapsed");
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data.vendor);
      setForm({
        name: data.vendor.name || "",
        company_name: data.vendor.company_name || "",
        industry: data.vendor.industry || "",
        country: data.vendor.country || "",
        brand_color: data.vendor.brand_color || "#c0c1ff",
      });
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSavedMessage("");
    try {
      const data = await api.updateProfile(form);
      setProfile(data.vendor);
      setSavedMessage("Profile saved successfully!");
      if (refreshVendor) await refreshVendor();
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSavedMessage("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (planId) => {
    setCheckoutLoading(true);
    try {
      const data = await api.createCheckout(planId, false);
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Stripe is not configured yet. Set STRIPE_SECRET_KEY in .env");
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      alert(err.message || "Checkout failed. Stripe may not be configured.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const currentPlan = profile?.subscription_plan || "trial";
  const currentPlanData = PLANS.find(p => p.id === currentPlan) || { name: "Trial", price: 0 };
  const isTrialing = profile?.subscription_status === "trialing" || currentPlan === "trial";

  if (loading) {
    return (
      <>
        <Sidebar activeLabel="Settings" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex items-center justify-center bg-background`}>
          <span className="material-symbols-outlined text-on-surface-variant animate-spin mr-2">sync</span>
          <span className="text-sm text-on-surface-variant">Loading settings...</span>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .bg-dot { background-image: radial-gradient(var(--dot-color) 1px, transparent 1px); background-size: 24px 24px; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #c0c1ff; box-shadow: 0 0 0 3px rgba(192,193,255,0.15); }
      `}</style>
      <Sidebar activeLabel="Settings" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 bg-dot pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant shrink-0 z-10">
          <h1 className="font-display text-2xl font-bold text-on-surface">Settings</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your account, plan, and preferences</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">

          {/* Profile Section */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary text-xl font-bold`}>
                {profile?.company_name?.charAt(0) || profile?.email?.charAt(0)?.toUpperCase() || "B"}
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-on-surface">Profile</h2>
                <p className="text-xs text-on-surface-variant">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Your Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Company</label>
                <input type="text" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" placeholder="Acme Inc." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Industry</label>
                <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface">
                  <option value="">Select industry</option>
                  <option value="technology">Technology</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="realestate">Real Estate</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Country</label>
                <input type="text" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" placeholder="United States" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.brand_color} onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))} className="w-10 h-10 rounded-xl border border-outline-variant cursor-pointer bg-transparent" />
                  <span className="text-xs text-on-surface-variant font-mono">{form.brand_color}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-outline/5">
              <button onClick={saveProfile} disabled={saving} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {savedMessage && (
                <span className={`text-xs flex items-center gap-1 ${savedMessage.includes("Failed") ? "text-rose-400" : "text-green-400"}`}>
                  <span className="material-symbols-outlined text-sm">{savedMessage.includes("Failed") ? "error" : "check_circle"}</span>
                  {savedMessage}
                </span>
              )}
            </div>
          </div>

          {/* Plan Section */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">Plan & Billing</h2>
            <p className="text-xs text-on-surface-variant mb-6">
              You are currently on the <strong className="text-primary capitalize">{currentPlan}</strong> plan.
              {isTrialing && profile?.trial_ends_at && ` Trial ends ${new Date(profile.trial_ends_at).toLocaleDateString()}.`}
              {profile?.conversations_limit && ` Usage: ${profile.conversations_used || 0}/${profile.conversations_limit} conversations.`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(plan => {
                const isCurrent = plan.id === currentPlan;
                return (
                  <div key={plan.id} className={`relative bg-surface-container-lowest rounded-2xl border p-5 transition-all ${isCurrent ? "border-primary ring-1 ring-primary/30" : "border-outline-variant hover:border-outline/30"}`}>
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-on-primary text-[10px] font-bold px-3 py-0.5 rounded-full">Current</div>
                    )}
                    <h3 className="font-display font-bold text-on-surface text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="font-display text-3xl font-bold text-on-surface">${plan.price}</span>
                      <span className="text-xs text-on-surface-variant">/mo</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {plan.chatbots} chatbot{plan.chatbots === 1 ? "" : "s"}
                      </li>
                      <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {plan.websites} website{plan.websites === 1 ? "" : "s"}
                      </li>
                      <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {plan.convos}
                      </li>
                      <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {plan.support} Support
                      </li>
                    </ul>
                    {!isCurrent && (
                      <button onClick={() => handleCheckout(plan.id)} disabled={checkoutLoading} className="w-full mt-5 py-2.5 border border-outline-variant bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-50">
                        {checkoutLoading ? "Redirecting..." : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Keys Section */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">API Access</h2>
            <p className="text-xs text-on-surface-variant mb-6">Use your bot ID as the API key to authenticate chat requests from your widget.</p>
            {profile?.email && (
              <div className="space-y-4">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">Bot ID (API Key)</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-on-surface text-sm font-mono px-4 py-2.5 rounded-lg border border-outline-variant select-all truncate" style={{backgroundColor: "var(--code-bg)"}}>
                      {vendor?.id || profile?.id || "Loading..."}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(vendor?.id || profile?.id || "");
                        alert("Bot ID copied to clipboard!");
                      }}
                      className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 mt-2">Use this as the <code className="text-primary">apiKey</code> parameter in your widget script.</p>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-8 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-rose-400 mb-2">Danger Zone</h2>
            <p className="text-xs text-on-surface-variant mb-4">Irreversible actions that affect your account.</p>
            <button className="px-5 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/20 active:scale-[0.98] transition-all">
              Delete Account
            </button>
          </div>

        </div>
      </main>
    </>
  );
}

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
  const { vendor, teamMember, refreshVendor, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [team, setTeam] = useState({ owner: null, members: [] });
  const [teamLoading, setTeamLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", password: "", role: "agent" });
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const canManageTeam = !teamMember || teamMember.role === "owner" || teamMember.role === "admin";
  const [cannedResponses, setCannedResponses] = useState([]);
  const [cannedForm, setCannedForm] = useState({ title: "", body: "" });
  const [cannedSaving, setCannedSaving] = useState(false);

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
      loadTeam();
      loadCannedResponses();
    }
  }, [isAuthenticated]);

  async function loadCannedResponses() {
    try {
      const data = await api.getCannedResponses();
      setCannedResponses(data.responses);
    } catch (err) {
      console.error("Failed to load canned responses:", err);
    }
  }

  const handleCreateCanned = async (e) => {
    e.preventDefault();
    if (!cannedForm.title.trim() || !cannedForm.body.trim()) return;
    setCannedSaving(true);
    try {
      await api.createCannedResponse(cannedForm);
      setCannedForm({ title: "", body: "" });
      await loadCannedResponses();
    } catch (err) {
      console.error("Failed to create canned response:", err);
    } finally {
      setCannedSaving(false);
    }
  };

  const handleDeleteCanned = async (id) => {
    try {
      await api.deleteCannedResponse(id);
      await loadCannedResponses();
    } catch (err) {
      console.error("Failed to delete canned response:", err);
    }
  };

  async function loadTeam() {
    setTeamLoading(true);
    try {
      const data = await api.getTeam();
      setTeam(data);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setTeamLoading(false);
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    try {
      await api.inviteTeamMember(inviteForm);
      setInviteForm({ email: "", name: "", password: "", role: "agent" });
      await loadTeam();
    } catch (err) {
      setInviteError(err.message || "Failed to invite team member");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.updateTeamMember(id, { role });
      await loadTeam();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await api.updateTeamMember(id, { isActive: !isActive });
      await loadTeam();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleRemoveMember = async (id) => {
    if (!confirm("Remove this team member? They will lose access immediately.")) return;
    try {
      await api.removeTeamMember(id);
      await loadTeam();
    } catch (err) {
      console.error("Failed to remove team member:", err);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  async function loadProfile() {
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
  }

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
        <Sidebar activeLabel="Settings" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
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
      <Sidebar activeLabel="Settings" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-dot" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px]" />
        </div>

        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Open menu">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <h1 className="font-display text-2xl font-bold text-on-surface">Settings</h1>
          </div>
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

          {/* Team Section */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">Team</h2>
            <p className="text-xs text-on-surface-variant mb-6">Invite teammates to help manage bots and support tickets.</p>

            {teamLoading ? (
              <p className="text-sm text-on-surface-variant">Loading team...</p>
            ) : (
              <div className="space-y-2 mb-6">
                {team.owner && (
                  <div className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
                        {team.owner.name?.slice(0, 2)?.toUpperCase() || team.owner.email?.slice(0, 2)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-on-surface font-medium">{team.owner.name || team.owner.email}</p>
                        <p className="text-[11px] text-on-surface-variant">{team.owner.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">Owner</span>
                  </div>
                )}
                {team.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-xs font-bold">
                        {m.name?.slice(0, 2)?.toUpperCase() || m.email?.slice(0, 2)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-on-surface font-medium">{m.name || m.email}</p>
                        <p className="text-[11px] text-on-surface-variant">{m.email}{!m.isActive && " · removed"}</p>
                      </div>
                    </div>
                    {canManageTeam ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="text-[11px] bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-on-surface"
                        >
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleToggleActive(m.id, m.isActive)} className="text-[11px] px-2 py-1 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors">
                          {m.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                        <button onClick={() => handleRemoveMember(m.id)} className="text-on-surface-variant hover:text-error transition-colors p-1" aria-label="Remove">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase">{m.role}</span>
                    )}
                  </div>
                ))}
                {team.members.length === 0 && (
                  <p className="text-xs text-on-surface-variant/60 text-center py-4">No teammates invited yet</p>
                )}
              </div>
            )}

            {canManageTeam && (
              <form onSubmit={handleInvite} className="pt-4 border-t border-outline/5 space-y-3">
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Invite a teammate</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="email" required placeholder="Email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                  <input type="text" placeholder="Name" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} className="bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                  <input type="text" required minLength={8} placeholder="Temporary password (min 8 chars)" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} className="bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                  <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface">
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <p className="text-[11px] text-on-surface-variant/60">There&apos;s no invite-email yet — share this password with them directly so they can log in and change it.</p>
                {inviteError && <p className="text-[11px] text-error">{inviteError}</p>}
                <button type="submit" disabled={inviting} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                  {inviting ? "Inviting..." : "Invite Teammate"}
                </button>
              </form>
            )}
          </div>

          {/* Canned Responses Section */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">Canned Responses</h2>
            <p className="text-xs text-on-surface-variant mb-6">Saved reply templates your team can insert with one click while replying to tickets.</p>

            <div className="space-y-2 mb-6">
              {cannedResponses.map((cr) => (
                <div key={cr.id} className="flex items-start justify-between gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface font-medium">{cr.title}</p>
                    <p className="text-xs text-on-surface-variant truncate">{cr.body}</p>
                  </div>
                  <button onClick={() => handleDeleteCanned(cr.id)} className="text-on-surface-variant hover:text-error transition-colors p-1 shrink-0" aria-label="Delete">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
              {cannedResponses.length === 0 && (
                <p className="text-xs text-on-surface-variant/60 text-center py-4">No canned responses yet</p>
              )}
            </div>

            <form onSubmit={handleCreateCanned} className="pt-4 border-t border-outline/5 space-y-3">
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Add a template</p>
              <input type="text" required placeholder="Title (e.g. Refund policy)" value={cannedForm.title} onChange={e => setCannedForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
              <textarea required rows={3} placeholder="Reply text..." value={cannedForm.body} onChange={e => setCannedForm(f => ({ ...f, body: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none" />
              <button type="submit" disabled={cannedSaving} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                {cannedSaving ? "Saving..." : "Add Template"}
              </button>
            </form>
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

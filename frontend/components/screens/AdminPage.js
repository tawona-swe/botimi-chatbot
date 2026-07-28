"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminPage() {
  const { vendor, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [overview, setOverview] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorsTotal, setVendorsTotal] = useState(0);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("botimiSidebarCollapsed");
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  // Auth guard + superadmin check
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (vendor && !vendor.isSuperadmin) {
        router.replace("/dashboard");
      }
    }
  }, [authLoading, isAuthenticated, vendor, router]);

  useEffect(() => {
    if (isAuthenticated && vendor?.isSuperadmin) {
      loadData();
    }
  }, [isAuthenticated, vendor?.isSuperadmin]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, vendorsData, flaggedData] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminVendors({ limit: 100 }),
        api.getAdminFlaggedMessages({ limit: 50 }),
      ]);
      setOverview(overviewData);
      setVendors(vendorsData.vendors || []);
      setVendorsTotal(vendorsData.total || 0);
      setFlaggedMessages(flaggedData.messages || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchVendors = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (vendorSearch) params.search = vendorSearch;
      if (vendorFilter) params.plan = vendorFilter;
      const data = await api.getAdminVendors(params);
      setVendors(data.vendors || []);
      setVendorsTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to search vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuspend = async (vendorId, currentlySuspended) => {
    try {
      await api.updateAdminVendor(vendorId, { is_suspended: currentlySuspended ? 0 : 1 });
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, is_suspended: currentlySuspended ? 0 : 1 } : v));
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  const dismissFlag = async (msgId) => {
    try {
      await api.dismissAdminFlag(msgId);
      setFlaggedMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error("Failed to dismiss flag:", err);
    }
  };

  const formatNumber = (n) => (n ?? 0).toLocaleString();
  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString() : "—";

  if (loading && !overview) {
    return (
      <>
        <Sidebar activeLabel="Admin" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex items-center justify-center bg-background`}>
          <span className="material-symbols-outlined text-on-surface-variant animate-spin mr-2">sync</span>
          <span className="text-sm text-on-surface-variant">Loading admin panel...</span>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; opacity: 0.6; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { opacity: 1; }
        .bg-dot { background-image: radial-gradient(var(--dot-color) 1px, transparent 1px); background-size: 24px 24px; }
      `}</style>
      <Sidebar activeLabel="Admin" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 bg-dot pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/4 rounded-full blur-[100px] pointer-events-none" />

        <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-outline-variant sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400">admin_panel_settings</span>
            <h1 className="font-display text-lg font-bold text-on-surface">Admin Panel</h1>
            <span className="font-label-md text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Super Admin</span>
          </div>
          <button onClick={loadData} className="text-on-surface-variant hover:text-on-surface transition-colors" title="Refresh">
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 px-6 lg:px-8 py-3 border-b border-outline-variant bg-surface-container-lowest/50">
          {[
            { id: "overview", label: "Overview", icon: "dashboard" },
            { id: "vendors", label: "Vendors", icon: "groups" },
            { id: "moderation", label: "Moderation", icon: "flag" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 lg:p-8 max-w-container-max mx-auto w-full space-y-6">
          {/* === OVERVIEW TAB === */}
          {activeTab === "overview" && overview && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Vendors", value: formatNumber(overview.totalVendors), sub: `${overview.activeVendors} active · ${overview.trialVendors} trialing`, icon: "groups", color: "text-primary" },
                  { label: "Monthly Recurring Revenue", value: `$${formatNumber(overview.mrr)}`, sub: `${overview.newVendorsThisMonth} new this month`, icon: "payments", color: "text-secondary" },
                  { label: "Conversations", value: formatNumber(overview.totalConversations), sub: `${overview.todayConversations} today · ${overview.resolutionRate}% resolved`, icon: "forum", color: "text-tertiary" },
                  { label: "Open Tickets", value: formatNumber(overview.openTickets), sub: `${overview.flaggedMessages} flagged messages`, icon: "confirmation_number", color: "text-amber-400" },
                ].map(card => (
                  <div key={card.label} className="bg-surface-container border border-outline-variant rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-md text-[11px] text-on-surface-variant font-medium tracking-wide uppercase">{card.label}</span>
                      <span className={`material-symbols-outlined text-sm ${card.color} opacity-80`}>{card.icon}</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-on-surface tracking-tight">{card.value}</p>
                    <p className="font-label-md text-[11px] text-on-surface-variant mt-2">{card.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
                  <h3 className="font-display text-sm font-bold text-on-surface mb-4">Vendors by Plan</h3>
                  {overview.byPlan.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {overview.byPlan.map(p => (
                        <div key={p.plan} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-on-surface">{p.plan || "unknown"}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-surface-container-high rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(p.count / overview.totalVendors) * 100}%` }} />
                            </div>
                            <span className="text-xs text-on-surface-variant w-8 text-right">{p.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
                  <h3 className="font-display text-sm font-bold text-on-surface mb-4">Model Usage</h3>
                  {overview.modelUsage.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {overview.modelUsage.map(m => (
                        <div key={m.model_used} className="flex items-center justify-between">
                          <span className="text-sm text-on-surface font-mono">{m.model_used}</span>
                          <span className="text-xs text-on-surface-variant">{m.count} calls</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* === VENDORS TAB === */}
          {activeTab === "vendors" && (
            <>
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                  placeholder="Search by name, company, or email..."
                  className="flex-1 min-w-[200px] bg-surface-container border border-outline/20 p-2.5 rounded-xl text-sm text-on-surface focus:border-primary outline-none"
                  onKeyDown={e => e.key === "Enter" && searchVendors()}
                />
                <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setTimeout(searchVendors, 0); }}
                  className="bg-surface-container border border-outline/20 p-2.5 rounded-xl text-sm text-on-surface outline-none">
                  <option value="">All Plans</option>
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                </select>
                <button onClick={searchVendors} className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                  Search
                </button>
              </div>

              <div className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-high">
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Company</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Email</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Plan</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Usage</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Joined</th>
                        <th className="text-left p-4 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-sm text-on-surface-variant">No vendors found</td></tr>
                      ) : vendors.map(v => (
                        <tr key={v.id} className="border-b border-outline/5 hover:bg-surface-container-low/50 transition-colors">
                          <td className="p-4">
                            <span className="font-medium text-on-surface">{v.company_name || v.name || "—"}</span>
                          </td>
                          <td className="p-4 text-on-surface-variant">{v.email}</td>
                          <td className="p-4">
                            <span className={`capitalize px-2 py-0.5 rounded text-[11px] font-bold border ${
                              v.subscription_plan === "scale" ? "text-primary border-primary/20 bg-primary/10"
                              : v.subscription_plan === "growth" ? "text-secondary border-secondary/20 bg-secondary/10"
                              : v.subscription_plan === "starter" ? "text-tertiary border-tertiary/20 bg-tertiary/10"
                              : "text-on-surface-variant border-outline-variant bg-surface-container-highest"
                            }`}>{v.subscription_plan}</span>
                          </td>
                          <td className="p-4">
                            <span className={`flex items-center gap-1.5 ${
                              v.is_suspended ? "text-rose-400" : v.subscription_status === "active" ? "text-green-400" : "text-amber-400"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                v.is_suspended ? "bg-rose-400" : v.subscription_status === "active" ? "bg-green-400" : "bg-amber-400"
                              }`} />
                              {v.is_suspended ? "Suspended" : v.subscription_status}
                            </span>
                          </td>
                          <td className="p-4 text-on-surface-variant">
                            {v.conversations_used}/{v.conversations_limit}
                          </td>
                          <td className="p-4 text-on-surface-variant">{formatDate(v.created_at)}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button onClick={() => toggleSuspend(v.id, v.is_suspended)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  v.is_suspended
                                    ? "border-green-500/20 text-green-400 bg-green-500/10 hover:bg-green-500/20"
                                    : "border-rose-500/20 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                                }`}>
                                {v.is_suspended ? "Reactivate" : "Suspend"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* === MODERATION TAB === */}
          {activeTab === "moderation" && (
            <div className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-outline-variant">
                <h3 className="font-display text-sm font-bold text-on-surface">Flagged Messages ({flaggedMessages.length})</h3>
                <p className="text-xs text-on-surface-variant mt-1">Messages flagged by the AI for potential policy violations</p>
              </div>
              {flaggedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">check_circle</span>
                  <p className="text-sm text-on-surface-variant">No flagged messages</p>
                  <p className="text-xs text-on-surface-variant/50 mt-1">All clear — no content requires moderation</p>
                </div>
              ) : (
                <div className="divide-y divide-outline/5">
                  {flaggedMessages.map(msg => (
                    <div key={msg.id} className="p-5 hover:bg-surface-container-low/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              msg.role === 'user' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                            }`}>{msg.role}</span>
                            <span className="text-xs text-on-surface-variant">{msg.vendor_name || "Unknown vendor"}</span>
                            <span className="text-xs text-on-surface-variant/50">{formatDate(msg.created_at)}</span>
                          </div>
                          <p className="text-sm text-on-surface line-clamp-3">{msg.content}</p>
                        </div>
                        <button onClick={() => dismissFlag(msg.id)}
                          className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-xs text-on-surface-variant rounded-lg transition-colors shrink-0">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

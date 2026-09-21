"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const CHART_WIDTH = 600;
const CHART_HEIGHT = 140;
const CHART_PAD = { top: 12, right: 12, bottom: 20, left: 12 };

/**
 * A single-series 30-day trend chart — no legend (single series doesn't
 * need one, the title already says what's plotted), hairline gridlines,
 * a 2px line with a ~10% opacity area wash, and a hover crosshair+tooltip
 * that snaps to the nearest day. Renders on a fixed viewBox and scales via
 * width:100%, so it stays crisp at any container width.
 */
function MiniTrendChart({ title, data, color = "var(--color-primary)" }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef(null);

  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const innerW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

  const xFor = (i) => CHART_PAD.left + (i / (data.length - 1)) * innerW;
  const yFor = (v) => CHART_PAD.top + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.count)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${CHART_PAD.top + innerH} L ${xFor(0)} ${CHART_PAD.top + innerH} Z`;

  const total = values.reduce((a, b) => a + b, 0);
  const latest = data[data.length - 1];

  const handleMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const idx = Math.round(((relX - CHART_PAD.left) / innerW) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const gridLines = [0, 0.5, 1];

  return (
    <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-display text-sm font-bold text-on-surface">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant">{total.toLocaleString()} in last {data.length} days</span>
          <button
            onClick={() => setShowTable((v) => !v)}
            className="text-[11px] text-on-surface-variant hover:text-primary underline decoration-dotted"
          >
            {showTable ? "View chart" : "View as table"}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="max-h-[140px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-container">
              <tr className="text-on-surface-variant text-left">
                <th className="font-medium py-1">Date</th>
                <th className="font-medium py-1 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-outline/5">
                  <td className="py-1 text-on-surface-variant">{new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  <td className="py-1 text-right text-on-surface tabular-nums">{d.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-[140px]"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {gridLines.map((frac) => (
              <line
                key={frac}
                x1={CHART_PAD.left} x2={CHART_WIDTH - CHART_PAD.right}
                y1={CHART_PAD.top + innerH * (1 - frac)} y2={CHART_PAD.top + innerH * (1 - frac)}
                stroke="var(--color-outline-variant)" strokeWidth="1"
              />
            ))}
            <path d={areaPath} fill={color} opacity="0.1" stroke="none" />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {/* End-dot + value, per spec: lines get labeled at the end, not on every point */}
            <circle cx={xFor(data.length - 1)} cy={yFor(latest.count)} r="4" fill={color} stroke="var(--color-surface-container)" strokeWidth="2" />

            {hovered && (
              <>
                <line
                  x1={xFor(hoverIdx)} x2={xFor(hoverIdx)}
                  y1={CHART_PAD.top} y2={CHART_PAD.top + innerH}
                  stroke="var(--color-outline-variant)" strokeWidth="1"
                />
                <circle cx={xFor(hoverIdx)} cy={yFor(hovered.count)} r="4" fill={color} stroke="var(--color-surface-container)" strokeWidth="2" />
              </>
            )}
          </svg>

          {hovered && (
            <div
              className="absolute top-0 -translate-x-1/2 bg-surface-container-highest border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs pointer-events-none shadow-lg"
              style={{ left: `${(xFor(hoverIdx) / CHART_WIDTH) * 100}%` }}
            >
              <p className="font-bold text-on-surface">{hovered.count.toLocaleString()}</p>
              <p className="text-on-surface-variant text-[10px]">{new Date(hovered.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { vendor, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorsTotal, setVendorsTotal] = useState(0);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [trendDays, setTrendDays] = useState(30);
  const [cohorts, setCohorts] = useState(null);
  const [cohortsLoading, setCohortsLoading] = useState(false);
  const [manageVendor, setManageVendor] = useState(null);
  const [manageForm, setManageForm] = useState(null);
  const [manageSaving, setManageSaving] = useState(false);
  const [vendorCharges, setVendorCharges] = useState([]);
  const [chargesLoading, setChargesLoading] = useState(false);

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

  // Re-fetch just the overview (not vendors/flagged) when the trend range
  // changes — everything else on the page is unaffected by the date range.
  useEffect(() => {
    if (isAuthenticated && vendor?.isSuperadmin && overview) {
      api.getAdminOverview(trendDays).then(setOverview).catch((err) => console.error("Failed to reload overview:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDays]);

  useEffect(() => {
    if (isAuthenticated && vendor?.isSuperadmin && activeTab === "retention" && !cohorts) {
      loadCohorts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, vendor?.isSuperadmin]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  async function loadCohorts() {
    setCohortsLoading(true);
    try {
      const data = await api.getAdminCohorts();
      setCohorts(data);
    } catch (err) {
      console.error("Failed to load cohorts:", err);
    } finally {
      setCohortsLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [overviewData, vendorsData, flaggedData] = await Promise.all([
        api.getAdminOverview(trendDays),
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
  }

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

  // conversation_credits (the live running balance) is deliberately not
  // part of this form -- it's shown read-only below. Hand-editing it could
  // silently desync real billing state in a way that's hard to notice
  // later; plan/status/limit/ticket_addon are safe to edit directly.
  const openManageVendor = async (v) => {
    setManageVendor(v);
    setManageForm({
      subscription_plan: v.subscription_plan,
      subscription_status: v.subscription_status,
      conversations_limit: v.conversations_limit,
      ticket_addon: !!v.ticketAddon,
    });
    setVendorCharges([]);
    setChargesLoading(true);
    try {
      const data = await api.getAdminVendorCharges(v.id);
      setVendorCharges(data.charges || []);
    } catch (err) {
      console.error("Failed to load vendor charges:", err);
    } finally {
      setChargesLoading(false);
    }
  };

  const closeManageVendor = () => {
    setManageVendor(null);
    setManageForm(null);
  };

  const saveManageVendor = async () => {
    if (!manageVendor || !manageForm) return;
    setManageSaving(true);
    try {
      const payload = {
        subscription_plan: manageForm.subscription_plan,
        subscription_status: manageForm.subscription_status,
        conversations_limit: parseInt(manageForm.conversations_limit, 10) || 0,
        ticket_addon: manageForm.ticket_addon ? 1 : 0,
      };
      await api.updateAdminVendor(manageVendor.id, payload);
      setVendors(prev => prev.map(v => v.id === manageVendor.id ? { ...v, ...payload, ticketAddon: !!payload.ticket_addon } : v));
      closeManageVendor();
    } catch (err) {
      console.error("Failed to save vendor changes:", err);
      alert(err.message || "Failed to save changes.");
    } finally {
      setManageSaving(false);
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

  // Render nothing while auth state resolves, before the redirect effect
  // above actually fires, or for an authenticated-but-non-superadmin vendor
  // -- without this, real cross-vendor business metrics (MRR, churn, every
  // vendor's data) briefly render before the redirect sends them away.
  if (authLoading || !isAuthenticated || (vendor && !vendor.isSuperadmin)) {
    return <div className="min-h-screen bg-background" />;
  }

  if (loading && !overview) {
    return (
      <>
        <Sidebar activeLabel="Admin" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
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
      <Sidebar activeLabel="Admin" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-dot" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/4 rounded-full blur-[100px]" />
        </div>

        <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-outline-variant sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Open menu">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <span className="material-symbols-outlined text-amber-400">admin_panel_settings</span>
            <h1 className="font-display text-lg font-bold text-on-surface">Admin Panel</h1>
            <span className="font-label-md text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 hidden sm:inline">Super Admin</span>
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
            { id: "retention", label: "Retention", icon: "donut_large" },
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
                  {
                    label: "Satisfaction",
                    value: overview.satisfactionRate === null ? "—" : `${overview.satisfactionRate}%`,
                    sub: overview.satisfactionRate === null ? "No feedback yet" : `${overview.feedbackUp} up · ${overview.feedbackDown} down`,
                    icon: "thumb_up", color: "text-green-400",
                  },
                  { label: "Churn Rate", value: `${overview.churnRate}%`, sub: `${overview.churnedVendors} canceled of ${overview.totalVendors}`, icon: "trending_down", color: "text-rose-400" },
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
                  <h3 className="font-display text-sm font-bold text-on-surface mb-4">Churn by Plan</h3>
                  {overview.churnByPlan.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No cancellations yet</p>
                  ) : (
                    <div className="space-y-3">
                      {overview.churnByPlan.map(p => (
                        <div key={p.plan} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-on-surface">{p.plan || "unknown"}</span>
                          <span className="text-xs text-on-surface-variant">{p.count} canceled</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
                  <h3 className="font-display text-sm font-bold text-on-surface mb-4">Feedback by Vendor</h3>
                  <p className="text-xs text-on-surface-variant -mt-3 mb-3">Lowest satisfaction first — where to look first</p>
                  {overview.feedbackByVendor.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No feedback yet</p>
                  ) : (
                    <div className="space-y-3 max-h-[180px] overflow-y-auto scrollbar-thin">
                      {overview.feedbackByVendor.map(v => (
                        <div key={v.id} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-on-surface truncate">{v.company_name || v.email}</span>
                          <span className={`text-xs shrink-0 ${v.satisfactionRate < 50 ? "text-rose-400" : "text-on-surface-variant"}`}>
                            {v.satisfactionRate}% · {v.up}↑ {v.down}↓
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-end gap-2 mb-3">
                  {[7, 30, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setTrendDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        trendDays === d ? "bg-primary text-on-primary" : "bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MiniTrendChart title="New Vendors" data={overview.dailySignups} color="var(--color-primary)" />
                  <MiniTrendChart title="Conversations" data={overview.dailyConversations} color="var(--color-secondary)" />
                </div>
              </div>
            </>
          )}

          {/* === RETENTION TAB === */}
          {activeTab === "retention" && (
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
              <h3 className="font-display text-sm font-bold text-on-surface mb-1">Weekly Signup Cohorts</h3>
              <p className="text-xs text-on-surface-variant mb-4">Of the vendors who signed up in a given week, % still not canceled N weeks later.</p>
              {cohortsLoading ? (
                <p className="text-sm text-on-surface-variant">Loading...</p>
              ) : !cohorts || cohorts.cohorts.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No signup data yet</p>
              ) : (
                <>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Cohort</th>
                          <th className="text-left p-2 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Size</th>
                          {Array.from({ length: Math.max(...cohorts.cohorts.map(c => c.retention.length)) }, (_, i) => (
                            <th key={i} className="text-center p-2 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">W{i}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cohorts.cohorts.map(c => (
                          <tr key={c.cohortWeek} className="border-t border-outline/5">
                            <td className="p-2 text-on-surface-variant whitespace-nowrap">{formatDate(c.cohortWeek)}</td>
                            <td className="p-2 text-on-surface-variant">{c.cohortSize}</td>
                            {c.retention.map(r => (
                              <td key={r.offsetWeeks} className="p-2 text-center">
                                <span
                                  className="inline-block px-2 py-1 rounded-lg text-xs font-bold tabular-nums"
                                  style={{
                                    backgroundColor: `color-mix(in srgb, var(--color-primary) ${r.retainedPct}%, transparent)`,
                                    color: r.retainedPct > 50 ? "var(--color-on-primary)" : "var(--color-on-surface)",
                                  }}
                                  title={`${r.retainedCount}/${r.totalCount} retained${r.unknownChurnCount ? ` (${r.unknownChurnCount} unknown-date cancellation${r.unknownChurnCount > 1 ? "s" : ""})` : ""}`}
                                >
                                  {r.retainedPct}%
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/70 mt-4">{cohorts.note}</p>
                </>
              )}
            </div>
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
                              <button onClick={() => openManageVendor(v)}
                                className="px-3 py-1 rounded-lg text-[11px] font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors">
                                Manage
                              </button>
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

      {manageVendor && manageForm && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={closeManageVendor}>
          <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">{manageVendor.company_name || manageVendor.name || "Vendor"}</h3>
                <p className="text-xs text-on-surface-variant">{manageVendor.email}</p>
              </div>
              <button onClick={closeManageVendor} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Plan</label>
                  <select value={manageForm.subscription_plan} onChange={e => setManageForm(f => ({ ...f, subscription_plan: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface">
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="scale">Business</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Status</label>
                  <select value={manageForm.subscription_status} onChange={e => setManageForm(f => ({ ...f, subscription_status: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface">
                    <option value="trialing">Trialing</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Conversations Limit</label>
                  <input type="number" min="0" value={manageForm.conversations_limit}
                    onChange={e => setManageForm(f => ({ ...f, conversations_limit: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl text-sm text-on-surface" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Credits (used / balance)</label>
                  <p className="text-sm text-on-surface p-2.5">
                    {manageVendor.conversations_used} used <span className="text-on-surface-variant/50">— view only</span>
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl cursor-pointer">
                <input type="checkbox" checked={manageForm.ticket_addon} onChange={e => setManageForm(f => ({ ...f, ticket_addon: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-on-surface font-medium">Ticket add-on enabled</span>
              </label>

              <div className="flex gap-3">
                <button onClick={saveManageVendor} disabled={manageSaving}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50">
                  {manageSaving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={closeManageVendor} className="px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-sm font-bold">
                  Cancel
                </button>
              </div>

              <div className="pt-2 border-t border-outline-variant">
                <h4 className="font-display text-sm font-bold text-on-surface mb-3">Payment History</h4>
                {chargesLoading ? (
                  <p className="text-xs text-on-surface-variant">Loading...</p>
                ) : vendorCharges.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No payment attempts recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                    {vendorCharges.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs">
                        <div>
                          <p className="text-on-surface font-medium capitalize">{c.charge_type} — {c.plan_id}</p>
                          <p className="text-on-surface-variant">{c.method} · {formatDate(c.created_at)}{c.attempt_number > 1 ? ` · attempt ${c.attempt_number}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-on-surface font-medium">{c.amount} {c.currency_code}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === "paid" ? "bg-green-500/10 text-green-400"
                            : c.status === "failed" ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                          }`}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

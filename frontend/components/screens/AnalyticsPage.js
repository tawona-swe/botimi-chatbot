"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [ticketAnalytics, setTicketAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d"); // 7d | 30d | 90d

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
      loadData();
    }
  }, [isAuthenticated]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, tickets] = await Promise.all([
        api.getAnalytics(),
        api.getTicketAnalytics().catch(() => null),
      ]);
      setAnalytics(overview);
      setTicketAnalytics(tickets);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n) => {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString();
  };

  const formatPct = (n) => {
    if (n === null || n === undefined) return "—";
    return `${n}%`;
  };

  if (loading) {
    return (
      <>
        <Sidebar activeLabel="Analytics" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex items-center justify-center bg-background`}>
          <span className="material-symbols-outlined text-on-surface-variant animate-spin mr-2">sync</span>
          <span className="text-sm text-on-surface-variant">Loading analytics...</span>
        </main>
      </>
    );
  }

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

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
      <Sidebar activeLabel="Analytics" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 bg-dot pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/4 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="px-8 py-6 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline/10 flex items-center justify-between shrink-0 z-10">
          <div>
            <h1 className="font-display text-2xl font-bold text-on-surface">Analytics</h1>
            <p className="text-sm text-on-surface-variant mt-1">Deep insights into your chatbot performance</p>
          </div>
          <div className="flex items-center gap-2 bg-surface-container rounded-xl p-1 border border-outline/10">
            {["7d", "30d", "90d"].map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === r ? "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]" : "text-on-surface-variant hover:text-on-surface"}`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Total Conversations", value: formatNumber(analytics?.totalConversations), icon: "forum", change: `+${formatNumber(analytics?.todayConversations || 0)} today`, color: "primary" },
              { label: "Resolution Rate", value: formatPct(analytics?.resolutionRate), icon: "task_alt", change: "Bot-auto resolved", color: "secondary" },
              { label: "Active Sessions", value: formatNumber(analytics?.activeSessions), icon: "bolt", change: "Last 30 min", color: "tertiary" },
              { label: "Avg Response Time", value: analytics?.avgResponseTime || "—", icon: "timer", change: "Last 100 msgs", color: "primary" },
            ].map(card => (
              <div key={card.label} className="bg-surface-container border border-outline/10 rounded-2xl p-6 hover:border-outline/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{card.label}</span>
                  <div className={`w-9 h-9 rounded-xl bg-${card.color}/10 flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-sm text-${card.color}`}>{card.icon}</span>
                  </div>
                </div>
                <p className="font-display text-3xl font-bold text-on-surface">{card.value}</p>
                <p className="text-[11px] text-on-surface-variant mt-2">{card.change}</p>
              </div>
            ))}
          </div>

          {/* Conversation Volume Chart */}
          <div className="bg-surface-container border border-outline/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-on-surface">Conversation Volume</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-on-surface-variant">Last {days} days</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-32">
              {analytics?.volumeByDay?.length > 0 ? (
                (() => {
                  const vol = analytics.volumeByDay;
                  const max = Math.max(...vol.map(v => v.count), 1);
                  return vol.slice(-days).map((d, i) => {
                    const height = Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.date}: ${d.count} conversations`}>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-container-high text-on-surface text-[10px] px-2 py-1 rounded-lg border border-outline/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{d.date}: {d.count}</div>
                        <div className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-lg transition-all duration-300 hover:from-primary/60 hover:to-primary min-h-[2px]" style={{ height: `${height}%` }} />
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="w-full flex items-center justify-center h-full">
                  <span className="text-xs text-on-surface-variant">No conversation data yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Questions */}
            <div className="bg-surface-container border border-outline/10 rounded-2xl p-6">
              <h2 className="font-display font-bold text-on-surface mb-4">Top Questions</h2>
              {analytics?.topQuestions?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topQuestions.slice(0, 8).map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-surface-container-lowest rounded-xl border border-outline/5">
                      <span className="text-sm text-on-surface truncate flex-1">{q.content}</span>
                      <div className="flex items-center gap-2 ml-3">
                        <div className="w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((q.count / Math.max(...analytics.topQuestions.map(x => x.count), 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-on-surface-variant min-w-[24px] text-right">{q.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 mb-2">question_answer</span>
                  <p className="text-xs text-on-surface-variant">No questions recorded yet</p>
                </div>
              )}
            </div>

            {/* Bot Resolution */}
            <div className="bg-surface-container border border-outline/10 rounded-2xl p-6">
              <h2 className="font-display font-bold text-on-surface mb-4">Bot Resolution Performance</h2>
              {analytics?.totalConversations > 0 ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="font-display text-5xl font-bold text-primary">{analytics.resolutionRate}%</p>
                    <p className="text-xs text-on-surface-variant mt-2">of conversations resolved by AI without human handoff</p>
                  </div>
                  <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000" style={{ width: `${Math.min(analytics.resolutionRate, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-surface-container-lowest rounded-xl p-4 text-center border border-outline/5">
                      <p className="font-display text-2xl font-bold text-on-surface">{formatNumber(analytics.botResolution?.resolved || 0)}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Bot Resolved</p>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl p-4 text-center border border-outline/5">
                      <p className="font-display text-2xl font-bold text-on-surface">{formatNumber((analytics.botResolution?.total || 0) - (analytics.botResolution?.resolved || 0))}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Needed Handoff</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 mb-2">analytics</span>
                  <p className="text-xs text-on-surface-variant">Not enough data yet</p>
                </div>
              )}
            </div>

          </div>

          {/* Ticket Analytics */}
          {ticketAnalytics && (
            <div className="bg-surface-container border border-outline/10 rounded-2xl p-6">
              <h2 className="font-display font-bold text-on-surface mb-4">Ticket Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Open", val: ticketAnalytics.open || 0, color: "text-amber-400" },
                  { label: "In Progress", val: ticketAnalytics.in_progress || 0, color: "text-primary" },
                  { label: "Resolved", val: ticketAnalytics.resolved || 0, color: "text-green-400" },
                  { label: "Total", val: (ticketAnalytics.open || 0) + (ticketAnalytics.in_progress || 0) + (ticketAnalytics.resolved || 0), color: "text-on-surface" },
                ].map(s => (
                  <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 text-center border border-outline/5">
                    <p className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}

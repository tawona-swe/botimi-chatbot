"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Only load analytics when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const saved = localStorage.getItem("botimiSidebarCollapsed");
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const formatNumber = (n) => {
    if (!n && n !== 0) return "—";
    return n.toLocaleString();
  };

  return (
    <>
      <Sidebar activeLabel="Overview" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col bg-background text-on-background font-body-md selection:bg-primary/30 relative overflow-x-hidden transition-all duration-300`}>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; opacity: 0.6; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { opacity: 1; }
        .glass-panel {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
        }
        .glass-hover:hover {
          background: var(--glass-hover-bg);
          border-color: var(--glass-border-hover);
        }
        .glass-strong {
          background: var(--glass-strong-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
        }
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, var(--shimmer-light) 45%, var(--shimmer-mid) 50%, var(--shimmer-light) 55%, transparent 60%);
          background-size: 300% 100%;
          animation: shimmer 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          40% { background-position: -100% 0; }
          100% { background-position: -100% 0; }
        }
        .bar {
          transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .bar:hover {
          opacity: 1 !important;
          transform: scaleY(1.08);
          transform-origin: bottom;
          filter: brightness(1.3);
        }
        .bg-dot {
          background-image: radial-gradient(var(--dot-color) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .text-gradient-primary {
          background: linear-gradient(135deg, #c0c1ff, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .text-gradient-secondary {
          background: linear-gradient(135deg, #a5f3fc, #67e8f9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ai-glow {
          box-shadow: 0 0 40px -10px rgba(192, 193, 255, 0.15);
        }
        .ai-glow-hover:hover {
          box-shadow: 0 0 40px -10px rgba(192, 193, 255, 0.25);
        }
      `}</style>

      <div className="absolute inset-0 bg-dot pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-[100px] pointer-events-none" />

      <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-background/80 backdrop-blur-md border-b border-outline-variant sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-bold text-on-surface">Dashboard</h1>
          <span className="font-label-md text-[11px] text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-md border border-outline-variant hidden sm:inline">Overview</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadAnalytics} className="text-on-surface-variant hover:text-on-surface transition-colors" title="Refresh">
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors text-2xl">notifications</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-br from-rose-400 to-pink-600 rounded-full border-2 border-background" />
          </div>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[12px] text-on-primary font-bold shadow-lg shadow-primary/20">
            BH
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-8 max-w-container-max mx-auto w-full space-y-6 relative z-10">
        {error && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Conversations", value: analytics?.totalConversations, display: formatNumber(analytics?.totalConversations), icon: "forum", color: "text-secondary", trend: analytics?.todayConversations ? `${analytics.todayConversations} today` : "—", trendColor: "text-secondary", gradient: "from-secondary/5 to-transparent" },
            { label: "Resolution Rate", value: analytics?.resolutionRate, display: analytics?.resolutionRate != null ? `${analytics.resolutionRate}%` : "—", icon: "task_alt", color: "text-primary", trend: analytics?.botResolution?.resolvedByBot ? `${analytics.botResolution.resolvedByBot} resolved` : "—", trendColor: "text-on-surface-variant", gradient: "from-primary/5 to-transparent" },
            { label: "Active Sessions", value: analytics?.activeSessions, display: formatNumber(analytics?.activeSessions), icon: "bolt", color: "text-tertiary", trend: "Live now", trendColor: "text-tertiary", pulse: (analytics?.activeSessions || 0) > 0, gradient: "from-tertiary/5 to-transparent" },
            { label: "Avg. Response Time", value: analytics?.avgResponseTime, display: analytics?.avgResponseTime || "—", icon: "timer", color: "text-amber-400", trend: analytics?.avgResponseTime !== "N/A" ? "Last 100 msgs" : "—", trendColor: "text-amber-400", gradient: "from-amber-500/5 to-transparent" },
          ].map((card) => (
            <div key={card.label} className={`glass-panel glass-hover rounded-2xl ${loading ? 'shimmer' : ''} ai-glow-hover overflow-hidden relative transition-all duration-300`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 pointer-events-none`} />
              <div className="p-5 relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-label-md text-[11px] text-on-surface-variant font-medium tracking-wide uppercase">{card.label}</span>
                  <span className={`material-symbols-outlined text-sm ${card.color} opacity-80`}>{card.icon}</span>
                </div>
                <p className="font-display text-3xl font-bold text-on-surface tracking-tight">{card.display}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {card.pulse && (
                    <span className="relative flex w-2 h-2">
                      <span className="animate-ping absolute inset-0 rounded-full bg-tertiary opacity-40" />
                      <span className="w-2 h-2 rounded-full bg-tertiary" />
                    </span>
                  )}
                  <span className={`font-label-md text-[11px] font-medium ${card.trendColor}`}>{card.trend}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 overflow-hidden relative border border-outline-variant">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full blur-[60px] pointer-events-none" />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="font-display text-sm font-bold text-on-surface">Conversation Volume</h3>
              <div className="flex gap-1.5 bg-surface-container-highest/50 p-0.5 rounded-lg border border-outline-variant">
                {["7D", "30D", "1Y"].map((t) => (
                  <button key={t} className={`px-3 py-1 font-label-md text-[10px] font-semibold rounded-md transition-all ${t === "7D" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="relative h-[280px] flex items-end gap-[3px]">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 25, 50, 75, 100].map((v) => (
                  <div key={v} className="border-t border-outline/5 w-full" />
                ))}
              </div>
              {(analytics?.volumeByDay?.length > 0 ? analytics.volumeByDay : [
                { date: "Day 1", count: 0 }, { date: "Day 2", count: 0 }
              ]).map((day, i) => {
                const maxCount = Math.max(...analytics?.volumeByDay?.map(d => d.count) || [1], 1);
                const heightPct = Math.max((day.count / maxCount) * 100, 2);
                return (
                  <div key={i} className="bar flex-1 relative group cursor-pointer" style={{ height: `${heightPct}%` }}>
                    <div className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500 bg-gradient-to-t from-primary/30 to-primary/10 group-hover:from-primary/50 group-hover:to-primary/20" style={{ height: "100%" }} />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 glass-strong px-2 py-1 rounded font-code-sm text-[9px] text-on-surface opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                      {day.count} convos
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-3 font-label-md text-[9px] text-on-surface-variant uppercase tracking-widest font-medium relative z-10">
              {(analytics?.volumeByDay?.length > 0 ? analytics.volumeByDay : []).slice(0, 14).map((day, i) => (
                <span key={i}>{day.date?.slice?.(5) || day.date}</span>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden ai-glow border border-outline-variant">
              <div className="absolute top-0 right-0 opacity-[0.04]">
                <span className="material-symbols-outlined text-[80px] text-on-surface">health_and_safety</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-bl from-secondary/[0.03] to-transparent pointer-events-none" />
              <h4 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 relative z-10">Bot Resolution</h4>
              <div className="flex items-center gap-5 relative z-10">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="7" className="text-outline/20" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="url(#healthGrad)" strokeWidth="7" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (analytics?.resolutionRate || 0) / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-in-out" }} />
                  </svg>
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 96 96">
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c0c1ff" />
                        <stop offset="100%" stopColor="#67e8f9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute font-display text-xl font-bold text-on-surface">{analytics?.resolutionRate ?? 0}%</span>
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-on-surface">{analytics?.resolutionRate >= 70 ? "Optimal" : analytics?.resolutionRate >= 40 ? "Improving" : "Needs training"}</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                    {analytics?.botResolution ? `${analytics.botResolution.resolvedByBot} resolved by bot, ${analytics.botResolution.escalated} escalated` : "Start training your bot to see metrics"}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-outline-variant">
              <h4 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Top Questions</h4>
              <div className="space-y-3">
                {(analytics?.topQuestions?.length > 0 ? analytics.topQuestions : []).slice(0, 6).map((item) => (
                  <div key={item.content} className="flex items-center justify-between py-1.5 group cursor-default">
                    <span className="text-[13px] text-on-surface-variant group-hover:text-on-surface transition-colors truncate mr-2">{item.content}</span>
                    <span className="shrink-0 bg-surface-container-highest px-2 py-0.5 rounded text-[10px] text-on-surface-variant font-code-sm">{item.count}</span>
                  </div>
                ))}
                {(!analytics?.topQuestions || analytics.topQuestions.length === 0) && (
                  <p className="text-[13px] text-on-surface-variant/60 text-center py-4">No question data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-outline-variant">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/[0.02] rounded-full blur-[80px] pointer-events-none" />
          <div className="flex justify-between items-center mb-5 relative z-10">
            <h3 className="font-display text-sm font-bold text-on-surface">Recent Conversations</h3>
            <button className="relative font-label-md text-[11px] font-semibold text-primary hover:text-secondary transition-colors" onClick={() => (window.location.href = "/support")}>
              View all
              <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-gradient-to-r from-primary to-secondary scale-x-0 group-hover:scale-x-100 transition-transform" />
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-thin relative z-10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  {["User", "Bot", "Duration", "Outcome", ""].map((h) => (
                    <th key={h} className="pb-3 font-label-md text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/5">
                {[
                  { user: "user_99238", src: "Web Chat", icon: "person", bot: "SupportBot_v2", dur: "4m 12s", outcome: "Resolved", color: "text-secondary", bg: "bg-secondary/10 border-secondary/20" },
                  { user: "customer@enterprise.com", src: "Email Relay", icon: "mail", bot: "SalesConcierge", dur: "12m 45s", outcome: "Handoff", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                  { user: "guest_88102", src: "Discord", icon: "person", bot: "FAQ_Assistant", dur: "1m 02s", outcome: "Resolved", color: "text-secondary", bg: "bg-secondary/10 border-secondary/20" },
                ].map((row, i) => (
                  <tr key={i} className="group hover:bg-surface-container-highest/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${row.bg.split(' ')[0]} flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-sm text-on-surface-variant">{row.icon}</span>
                        </div>
                        <div>
                          <p className="text-[13px] text-on-surface font-medium group-hover:text-primary transition-colors">{row.user}</p>
                          <p className="text-[10px] text-on-surface-variant">{row.src}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[13px] text-on-surface-variant">{row.bot}</td>
                    <td className="py-3.5 pr-4 text-[13px] text-on-surface-variant">{row.dur}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`font-label-md text-[10px] font-semibold px-2 py-0.5 rounded border ${row.bg} ${row.color}`}>{row.outcome}</span>
                    </td>
                    <td className="py-3.5">
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="border-t border-outline-variant py-6 px-6 lg:px-8 bg-background relative z-10 mt-auto">
        <div className="max-w-container-max mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-sm font-bold text-gradient-primary">botimi</span>
            <span className="font-body-sm text-xs text-on-surface-variant">&copy; 2024 botimi AI Ecosystem.</span>
          </div>
          <div className="flex gap-6">
            <a className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors" href="/">Home</a>
            <a className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors" href="/support">Support</a>
            <a className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors" href="/onboarding">Onboarding</a>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}

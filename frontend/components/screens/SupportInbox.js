"use client";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../ui/Sidebar";

export default function SupportInbox() {
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState("conversation");
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("botimiSidebarCollapsed");
    if (saved) setSidebarCollapsed(saved === "true");
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAiSuggestion(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .glass-panel {
          background: rgba(17, 17, 24, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glass-hover:hover {
          background: rgba(31, 31, 39, 0.8);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .glass-strong {
          background: rgba(41, 41, 50, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%);
          background-size: 300% 100%;
          animation: shimmer 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          40% { background-position: -100% 0; }
          100% { background-position: -100% 0; }
        }
        .bg-dot {
          background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .text-gradient-primary {
          background: linear-gradient(135deg, #c0c1ff, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ai-glow {
          box-shadow: 0 0 40px -10px rgba(192, 193, 255, 0.15);
        }
      `}</style>
      <Sidebar activeLabel="Support" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 flex flex-col h-screen bg-background text-on-background font-body-md overflow-hidden relative transition-all duration-300`}>
        <div className="absolute inset-0 bg-dot pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-secondary/3 rounded-full blur-[80px] pointer-events-none" />

        <header className="h-16 flex items-center justify-between px-8 bg-background/80 backdrop-blur-md border-b border-outline/10 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-4">
              <h2 className="font-display text-xl font-bold text-gradient-primary">Support Inbox</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full border border-outline/10">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-secondary opacity-40" />
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                </span>
                <span className="font-label-md text-[11px] text-on-surface-variant">42 Agents Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface cursor-pointer transition-colors">search</span>
            </div>
            <div className="relative group">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface cursor-pointer transition-colors">notifications</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-rose-400 to-pink-600 text-[10px] flex items-center justify-center rounded-full text-white font-bold shadow-lg shadow-rose-500/20">3</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm shadow-lg shadow-primary/20">
              JD
            </div>
          </div>
        </header>

        <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-surface-container-lowest/50 border-b border-outline/10 overflow-x-auto shrink-0">
          <button onClick={() => setActivePanel("tickets")} className={`px-4 py-1.5 rounded-full font-label-md text-xs whitespace-nowrap transition-all ${activePanel === "tickets" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-highest"}`}>Tickets</button>
          <button onClick={() => setActivePanel("conversation")} className={`px-4 py-1.5 rounded-full font-label-md text-xs whitespace-nowrap transition-all ${activePanel === "conversation" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-highest"}`}>Conversation</button>
          <button onClick={() => setActivePanel("sla")} className={`px-4 py-1.5 rounded-full font-label-md text-xs whitespace-nowrap transition-all ${activePanel === "sla" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-highest"}`}>SLA & Details</button>
        </div>

        <section className="flex flex-1 overflow-hidden relative z-10">
          <div className="w-72 max-lg:w-full border-r border-outline/10 flex flex-col bg-surface-container-lowest/80 backdrop-blur-sm shrink-0 max-lg:border-r-0" style={{ display: isMobile ? (activePanel === "tickets" ? "flex" : "none") : "flex" }}>
            <div className="p-4 flex gap-2 overflow-x-auto scrollbar-thin border-b border-outline/10">
              <button className="px-3 py-1.5 rounded-full bg-surface-container-highest text-on-surface font-label-md text-[11px] whitespace-nowrap shadow-sm border border-outline/10">All Tickets</button>
              <button className="px-3 py-1.5 rounded-full bg-transparent text-on-surface-variant font-label-md text-[11px] whitespace-nowrap hover:bg-surface-container transition-colors">Unassigned</button>
              <button className="px-3 py-1.5 rounded-full bg-transparent text-on-surface-variant font-label-md text-[11px] whitespace-nowrap hover:bg-surface-container transition-colors">My Open</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="shimmer bg-surface-container-low border-b border-outline/10 cursor-pointer border-l-4 border-l-primary">
                <div className="p-4 relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-primary font-label-md text-xs tracking-wider uppercase">TKT-8842</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">URGENT</span>
                  </div>
                  <h4 className="font-display font-semibold text-on-surface text-sm line-clamp-1">API Authentication Failure</h4>
                  <p className="text-on-surface-variant text-xs mt-1">Alex Rivers</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-secondary">history</span>
                      <span className="font-label-md text-[10px] text-on-surface-variant">2m ago</span>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant font-label-md text-[10px] rounded uppercase border border-outline/10">In-Progress</span>
                  </div>
                </div>
              </div>
              {[
                { id: "TKT-8839", label: "HIGH", labelCls: "text-tertiary border-tertiary/20 bg-tertiary/10", title: "Bot unresponsive to Webhooks", name: "Sarah Chen", time: "15m ago", status: "Open" },
                { id: "TKT-8835", label: "LOW", labelCls: "text-on-surface-variant border-outline/20 bg-surface-container-highest", title: "Invoice clarity request", name: "Mark Thompson", time: "1h ago", status: "Resolved" },
                { id: "TKT-8831", label: "MEDIUM", labelCls: "text-primary border-primary/20 bg-primary/10", title: "Custom CSS injection error", name: "Elena G.", time: "3h ago", status: "In-Progress" },
              ].map((t) => (
                <div key={t.id} className="p-4 border-b border-outline/5 hover:bg-surface-container/50 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-on-surface-variant font-label-md text-xs tracking-wider uppercase">{t.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${t.labelCls}`}>{t.label}</span>
                  </div>
                  <h4 className="font-display font-semibold text-on-surface/90 text-sm line-clamp-1">{t.title}</h4>
                  <p className="text-on-surface-variant text-xs mt-1">{t.name}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">history</span>
                      <span className="font-label-md text-[10px] text-on-surface-variant">{t.time}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container-lowest text-on-surface-variant font-label-md text-[10px] rounded uppercase border border-outline/5">{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-conversation flex-1 flex flex-col bg-background/50 relative" style={{ display: isMobile ? (activePanel === "conversation" ? "flex" : "none") : "flex" }}>
            <div className="px-6 py-4 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">person</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-on-surface text-sm">Alex Rivers <span className="text-on-surface-variant font-body-sm font-normal ml-2 text-xs">rivers.dev@gmail.com</span></h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-label-md text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">Tier 1 Support</span>
                    <span className="font-label-md text-[10px] text-on-surface-variant">Pro Plan Subscriber</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">call</span></button>
                <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              <div className="flex gap-4 max-w-2xl">
                <div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0 flex items-center justify-center border border-outline/10">
                  <span className="font-label-md text-[10px] font-bold text-on-surface-variant">AR</span>
                </div>
                <div>
                  <div className="bg-surface-container border border-outline/10 p-5 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-sm text-on-surface leading-relaxed">Hi support team. I'm trying to integrate the Auth API but I keep getting a 403 Forbidden error even with the correct API key. I've tried regenerating the token three times but no luck. Is there a server-side issue today?</p>
                    <div className="mt-4 p-4 bg-[#050508] rounded-xl border border-outline/10 font-code-sm text-secondary font-mono text-xs overflow-x-auto">
                      curl -X POST "https://api.botimi.ai/v1/auth" \<br />
                      -H "Authorization: Bearer [REDACTED]"
                    </div>
                  </div>
                  <span className="font-label-md text-[10px] text-on-surface-variant mt-2 block ml-1">Today at 10:42 AM</span>
                </div>
              </div>

              <div className="flex justify-center my-8">
                <div className="bg-surface-container-highest/80 backdrop-blur-md px-5 py-2.5 rounded-full flex items-center gap-3 border border-outline/20 shadow-lg shimmer ai-glow">
                  <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                  <span className="font-label-md text-[11px] font-medium text-on-surface">AI Agent drafted a suggested response</span>
                  <button className="ml-2 font-label-md text-[11px] font-bold text-primary hover:text-secondary transition-colors">Review</button>
                </div>
              </div>

              <div className="flex gap-4 max-w-2xl ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary shrink-0 flex items-center justify-center shadow-md shadow-primary/20">
                  <span className="font-label-md text-[10px] font-bold text-on-primary">JD</span>
                </div>
                <div>
                  <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl rounded-tr-none shadow-sm">
                    <p className="text-sm text-on-surface leading-relaxed">Hello Alex, I'm checking our logs now. It seems your IP was temporarily throttled due to high frequency requests during the test phase. I've whitelisted your development environment IP.</p>
                  </div>
                  <span className="font-label-md text-[10px] text-on-surface-variant mt-2 block text-right mr-1">Today at 10:55 AM</span>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <div className="bg-tertiary/5 border border-tertiary/20 p-4 rounded-xl max-w-md w-full border-l-4 border-l-tertiary relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <span className="material-symbols-outlined text-4xl text-tertiary">lock</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
                    <span className="font-label-md text-[10px] font-bold text-tertiary uppercase tracking-wider">Internal Note</span>
                  </div>
                  <p className="text-xs text-on-surface-variant italic relative z-10">Checked Datadog logs. User was hitting 403 because of rate limit. Whitelisting applied manually for cid_9921.</p>
                  <span className="font-label-md text-[10px] text-on-surface-variant/50 mt-3 block relative z-10">John Doe (Agent) &bull; 2m ago</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-container-lowest/80 backdrop-blur-sm border-t border-outline/10">
              <div className="glass-panel rounded-2xl overflow-hidden focus-within:border-primary/40 transition-all shadow-lg">
                <div className="flex gap-2 px-4 py-3 bg-surface-container-low border-b border-outline/10">
                  <button className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded-md">Public Reply</button>
                  <button className="px-3 py-1 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-md transition-colors">Internal Note</button>
                </div>
                <textarea
                  ref={textareaRef}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-on-surface p-5 text-sm resize-none h-28 placeholder:text-outline scrollbar-thin"
                  placeholder="Type your response here... Use / for shortcuts"
                  onInput={handleTextareaInput}
                ></textarea>
                <div className="flex items-center justify-between px-5 py-4 bg-surface-container-low border-t border-outline/5">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <button className="p-1.5 hover:bg-surface-container-highest hover:text-on-surface rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">attachment</span></button>
                    <button className="p-1.5 hover:bg-surface-container-highest hover:text-on-surface rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">mood</span></button>
                    <button className="p-1.5 hover:bg-surface-container-highest hover:text-on-surface rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">format_bold</span></button>
                    <div className="w-px h-5 bg-outline/20 mx-1"></div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors group">
                      <span className="material-symbols-outlined text-[18px] group-hover:text-primary">auto_awesome</span>
                      <span className="font-label-md text-[11px] font-medium">Smart Compose</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 group cursor-pointer overflow-hidden">
                      <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold group-hover:brightness-110 transition-all">
                        <span>Send</span>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      </button>
                      <button className="px-2 py-2.5 border-l border-white/20 group-hover:brightness-110 transition-all">
                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-sla w-72 max-lg:w-full border-l max-lg:border-l-0 max-lg:border-t border-outline/10 flex flex-col bg-surface-container-lowest/80 backdrop-blur-sm shrink-0 overflow-y-auto scrollbar-thin p-6 space-y-8" style={{ display: isMobile ? (activePanel === "sla" ? "flex" : "none") : "flex" }}>
            <div>
              <h5 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">SLA Status</h5>
              <div className="bg-surface-container border border-outline/10 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-md text-[11px] font-medium text-on-surface-variant">Time to First Response</span>
                  <span className="text-secondary font-bold text-xs bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">Met</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-label-md text-[11px] font-medium text-on-surface-variant">Resolution Target</span>
                  <span className="text-rose-400 font-bold text-xs">42m left</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Assignment</h5>
              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Assigned Agent</label>
                  <div className="flex items-center justify-between p-3 bg-surface-container border border-outline/10 rounded-xl hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold text-on-primary shadow-sm">JD</div>
                      <span className="font-body-sm text-sm text-on-surface font-medium">John Doe</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant cursor-pointer hover:text-primary transition-colors">edit</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Department</label>
                  <div className="flex items-center justify-between p-3 bg-surface-container border border-outline/10 rounded-xl hover:border-primary/30 transition-colors">
                    <span className="font-body-sm text-sm text-on-surface font-medium">Technical Support</span>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant cursor-pointer hover:text-primary transition-colors">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">User Intelligence</h5>
              <div className="bg-surface-container border border-outline/10 rounded-2xl overflow-hidden py-1">
                {[
                  { label: "Region", val: "US-EAST-1" },
                  { label: "Account Age", val: "14 Months" },
                  { label: "ARR", val: "$12,400" },
                  { label: "Health Score", val: "92/100", cls: "text-secondary font-bold" },
                ].map((r, i) => (
                  <div key={r.label} className={`flex items-center justify-between p-3 ${i !== 0 ? 'border-t border-outline/5' : ''} hover:bg-surface-container-highest transition-colors`}>
                    <span className="font-label-md text-[11px] text-on-surface-variant">{r.label}</span>
                    <span className={`font-label-md text-[11px] text-on-surface ${r.cls || ""}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="font-label-md text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Resources</h5>
              <div className="space-y-1">
                <a className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container transition-colors group" href="#">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">description</span>
                  <span className="font-body-sm text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">API Auth Docs</span>
                </a>
                <a className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container transition-colors group" href="#">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">developer_board</span>
                  <span className="font-body-sm text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">User Bot: "FinanceWise"</span>
                </a>
                <a className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container transition-colors group" href="#">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">bug_report</span>
                  <span className="font-body-sm text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">Open Jira Issue #421</span>
                </a>
              </div>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button className="w-full py-2.5 bg-surface-container border border-outline/10 rounded-xl font-bold text-xs text-on-surface hover:bg-surface-container-high hover:border-outline/20 transition-all shadow-sm">Mark Resolved</button>
              <button className="w-full py-2.5 bg-transparent border border-outline/10 rounded-xl font-bold text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all">Escalate to Dev</button>
            </div>
          </div>
        </section>
      </main>
      {showAiSuggestion && (
        <div className="fixed bottom-10 right-10 glass-panel border-primary/30 p-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer group hover:scale-[1.02] transition-all ai-glow z-50">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div className="pr-6">
            <p className="font-label-md text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Agent Helper</p>
            <p className="font-body-sm text-sm text-on-surface">Check rate limit tables for this user?</p>
          </div>
          <button className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors" onClick={() => setShowAiSuggestion(false)}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </>
  );
}
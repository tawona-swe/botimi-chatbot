"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function SupportInbox() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState("conversation");
  const [isMobile, setIsMobile] = useState(false);
  const [isMobilePanel, setIsMobilePanel] = useState("list"); // list | detail
  const textareaRef = useRef(null);

  // API‑integrated state
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState("public"); // public | internal
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unassigned | mine

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Only load tickets when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [filter, isAuthenticated]);

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

  // Auto‑show AI suggestion after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAiSuggestion(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filter === "unassigned") params.status = "open";
      else if (filter === "mine") params.assigned = "me";
      const data = await api.getTickets(params);
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setIsMobilePanel("detail");
    try {
      const data = await api.getTicket(ticket.id);
      // Backend returns { ticket, replies } — map replies to messages format
      const mapped = (data.replies || []).map(r => ({
        id: r.id,
        role: r.author_type === 'customer' ? 'user' : r.author_type === 'agent' ? 'agent' : 'system',
        body: r.body,
        content: r.body,
        is_internal_note: r.is_internal_note,
        author_name: r.author_name,
        created_at: r.created_at,
      }));
      setMessages(mapped);
      // Also update ticket details
      if (data.ticket) {
        setSelectedTicket(prev => ({ ...prev, ...data.ticket }));
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
      setMessages([]);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setIsSending(true);
    try {
      await api.replyToTicket(selectedTicket.id, replyText, replyMode === "internal");
      // Reload messages
      const data = await api.getTicket(selectedTicket.id);
      const mapped = (data.replies || []).map(r => ({
        id: r.id,
        role: r.author_type === 'customer' ? 'user' : r.author_type === 'agent' ? 'agent' : 'system',
        body: r.body,
        content: r.body,
        is_internal_note: r.is_internal_note,
        author_name: r.author_name,
        created_at: r.created_at,
      }));
      setMessages(mapped);
      if (data.ticket) {
        setSelectedTicket(prev => ({ ...prev, ...data.ticket }));
      }
      setReplyText("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await api.updateTicket(selectedTicket.id, { status: "resolved" });
      setSelectedTicket(prev => ({ ...prev, status: "resolved" }));
      loadTickets();
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket) return;
    try {
      const agentName = prompt("Assign to agent name:");
      if (agentName) {
        await api.assignTicket(selectedTicket.id, agentName);
        loadTickets();
      }
    } catch (err) {
      console.error("Failed to assign ticket:", err);
    }
  };

  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  // Helpers
  const priorityClass = (p) => {
    const map = { urgent: "text-rose-400 border-rose-500/20 bg-rose-500/10", high: "text-tertiary border-tertiary/20 bg-tertiary/10", medium: "text-primary border-primary/20 bg-primary/10", low: "text-on-surface-variant border-outline/20 bg-surface-container-highest" };
    return map[p] || "text-on-surface-variant border-outline/20 bg-surface-container-highest";
  };

  const statusClass = (s) => {
    const map = { open: "bg-amber-500/10 text-amber-400", in_progress: "bg-primary/10 text-primary", resolved: "bg-green-500/10 text-green-400", closed: "bg-surface-container-highest text-on-surface-variant" };
    return map[s] || "bg-surface-container-lowest text-on-surface-variant";
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
        .ticket-row { transition: all 0.15s ease; }
        .ticket-row:hover { background: var(--color-surface-container); }
        .ticket-row.active { background: var(--color-surface-container-low); }
        .ticket-row.active .ticket-indicator { opacity: 1; }
        .convo-enter { animation: slideUp 0.25s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <Sidebar activeLabel="Support" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 flex flex-col h-screen bg-background text-on-background overflow-hidden transition-all duration-300`}>

        {/* HEADER */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-outline/10 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-on-surface-variant hover:text-on-surface" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-base font-bold text-on-surface tracking-tight">Support Inbox</h1>
            <span className="text-xs text-on-surface-variant/50 px-2 py-0.5 bg-surface-container-low rounded-md border border-outline/10">{tickets.length} tickets</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined text-on-surface-variant/60 hover:text-on-surface cursor-pointer text-lg">notifications</span>
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 text-[7px] flex items-center justify-center rounded-full text-white font-bold">3</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs">JD</div>
          </div>
        </header>

        {/* MAIN BODY */}
        <div className="flex flex-1 overflow-hidden">

          {/* ─── LEFT: TICKET LIST ─── */}
          <aside className="w-[300px] max-lg:w-full border-r border-outline/10 flex flex-col shrink-0 bg-surface-container-lowest/40" style={{ display: isMobile && selectedTicket ? "none" : "flex" }}>
            {/* Search + Filters */}
            <div className="p-3 border-b border-outline/10 space-y-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-sm">search</span>
                <input className="w-full bg-surface-container-low border border-outline/10 rounded-lg pl-8 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all" placeholder="Search tickets..." />
              </div>
              <div className="flex gap-1.5">
                {["all", "unassigned", "mine"].map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${filter === f ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container"}`}>
                    {f === "all" ? "All" : f === "unassigned" ? "Unassigned" : "My Open"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket rows */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="material-symbols-outlined text-on-surface-variant/40 animate-spin text-lg">sync</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 mb-2">confirmation_number</span>
                  <p className="text-xs text-on-surface-variant">No tickets yet</p>
                  <p className="text-[10px] text-on-surface-variant/40 mt-0.5">Escalated chats appear here</p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} onClick={() => loadTicket(t)} className={`ticket-row relative px-4 py-3 border-b border-outline/5 cursor-pointer ${selectedTicket?.id === t.id ? "active" : ""}`}>
                    <div className="ticket-indicator absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary opacity-0 transition-opacity" />
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-[10px] text-on-surface-variant/50 font-mono">{t.ticket_number || `TKT-${t.id?.slice(0, 6)}`}</span>
                      {t.priority && t.priority !== "none" && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${priorityClass(t.priority)}`}>{t.priority[0].toUpperCase()}</span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-on-surface leading-snug line-clamp-1">{t.subject || "No subject"}</h4>
                    <p className="text-[11px] text-on-surface-variant/70 mt-0.5 line-clamp-1">{t.customer_name || t.customer_email || "Anonymous"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-on-surface-variant/40">{formatTime(t.updated_at || t.created_at)}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${statusClass(t.status)}`}>
                        {t.status === "in_progress" ? "In Progress" : t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ─── RIGHT: CONVERSATION + DETAILS ─── */}
          <section className="flex-1 flex flex-col bg-background/30" style={{ display: isMobile && !selectedTicket ? "none" : "flex" }}>
            {!selectedTicket ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/15 mb-3">forum</span>
                  <p className="text-sm text-on-surface-variant">Select a ticket to view</p>
                  <p className="text-xs text-on-surface-variant/40 mt-1">Choose a conversation from the left panel</p>
                </div>
              </div>
            ) : (
              <>
              {/* Ticket header */}
              <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between bg-surface-container-lowest/30">
                <div className="flex items-center gap-3 min-w-0">
                  {isMobile && (
                    <button onClick={() => { setSelectedTicket(null); setIsMobilePanel("list"); }} className="p-1 text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-lg">person</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-on-surface truncate">{selectedTicket.customer_name || "Anonymous"}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 mt-0.5">
                      <span className="truncate">{selectedTicket.customer_email || ""}</span>
                      <span className="w-1 h-1 rounded-full bg-on-surface-variant/20" />
                      <span className={`font-semibold ${statusClass(selectedTicket.status).split(" ")[1] || "text-on-surface-variant"}`}>{selectedTicket.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                    <button onClick={handleResolve} className="px-3 py-1.5 border border-outline/10 bg-surface-container text-on-surface rounded-lg text-[10px] font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all whitespace-nowrap">
                      Resolve
                    </button>
                  )}
                  <button className="p-1.5 text-on-surface-variant/60 hover:text-on-surface rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </div>
              </div>

              {/* Tabs: Conversation | Details */}
              <div className="flex gap-0 px-5 border-b border-outline/10 bg-surface-container-lowest/20">
                <button onClick={() => setActivePanel("conversation")} className={`px-4 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${activePanel === "conversation" ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-on-surface"}`}>
                  Conversation
                </button>
                <button onClick={() => setActivePanel("details")} className={`px-4 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${activePanel === "details" ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-on-surface"}`}>
                  Details
                </button>
              </div>

              {/* Tab: Conversation */}
              {activePanel === "conversation" && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <span className="text-xs text-on-surface-variant/50">No messages yet</span>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`convo-enter flex gap-3 max-w-[640px] ${msg.role === "agent" || msg.is_internal_note ? "ml-auto flex-row-reverse" : ""}`} style={{ animationDelay: `${idx * 30}ms` }}>
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border border-outline/10 ${msg.role === "agent" || msg.is_internal_note ? "bg-primary" : "bg-surface-container-high"}`}>
                            <span className="text-[8px] font-bold text-on-surface-variant">{msg.role === "agent" || msg.is_internal_note ? "A" : "U"}</span>
                          </div>
                          <div className="min-w-0">
                            {msg.is_internal_note ? (
                              <div className="bg-tertiary/5 border border-tertiary/20 p-3 rounded-xl max-w-md border-l-[3px] border-l-tertiary">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="material-symbols-outlined text-[12px] text-tertiary">lock</span>
                                  <span className="text-[9px] font-bold text-tertiary uppercase tracking-wider">Internal Note</span>
                                </div>
                                <p className="text-xs text-on-surface-variant italic">{msg.body || msg.content}</p>
                                <span className="text-[9px] text-on-surface-variant/40 mt-2 block">{msg.author_name || "Agent"} &bull; {formatDate(msg.created_at)}</span>
                              </div>
                            ) : (
                              <>
                                <div className={`p-4 rounded-xl shadow-sm ${msg.role === "agent" ? "bg-primary/10 border border-primary/15 rounded-tr-none" : "bg-surface-container border border-outline/10 rounded-tl-none"}`}>
                                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{msg.body || msg.content}</p>
                                </div>
                                <span className="text-[9px] text-on-surface-variant/40 mt-1.5 block ml-1">{formatDate(msg.created_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply box */}
                  <div className="p-3 border-t border-outline/10 bg-surface-container-lowest/50">
                    <div className="border border-outline/10 rounded-xl overflow-hidden focus-within:border-primary/30 transition-colors bg-surface-container-low">
                      <div className="flex gap-1 px-3 pt-2.5 pb-1.5 border-b border-outline/5">
                        <button onClick={() => setReplyMode("public")} className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${replyMode === "public" ? "text-primary bg-primary/10" : "text-on-surface-variant/60 hover:text-on-surface"}`}>Reply</button>
                        <button onClick={() => setReplyMode("internal")} className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${replyMode === "internal" ? "text-tertiary bg-tertiary/10" : "text-on-surface-variant/60 hover:text-on-surface"}`}>Note</button>
                      </div>
                      <textarea ref={textareaRef} className="w-full bg-transparent border-none outline-none focus:ring-0 text-on-surface p-3 text-xs resize-none h-24 placeholder:text-on-surface-variant/30 scrollbar-thin" placeholder={replyMode === "public" ? "Type your reply..." : "Add an internal note (visible to your team)..."} value={replyText} onChange={(e) => { setReplyText(e.target.value); handleTextareaInput(e); }} />
                      <div className="flex items-center justify-between px-3 py-2 border-t border-outline/5">
                        <div className="flex items-center gap-2 text-on-surface-variant/50">
                          <button className="p-1 hover:text-on-surface transition-colors"><span className="material-symbols-outlined text-base">attachment</span></button>
                          <button className="p-1 hover:text-on-surface transition-colors"><span className="material-symbols-outlined text-base">mood</span></button>
                        </div>
                        <button onClick={handleSendReply} disabled={!replyText.trim() || isSending} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-[11px] font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSending ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span> Sending</> : <><span>Send</span> <span className="material-symbols-outlined text-sm">send</span></>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Details */}
              {activePanel === "details" && (
                <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                  {/* Ticket Info */}
                  <div>
                    <h5 className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2.5">Ticket Info</h5>
                    <div className="bg-surface-container border border-outline/10 rounded-xl overflow-hidden">
                      {[
                        { label: "Ticket #", val: selectedTicket.ticket_number || selectedTicket.id?.slice(0, 8) || "—" },
                        { label: "Status", val: selectedTicket.status || "—" },
                        { label: "Priority", val: selectedTicket.priority || "—" },
                        { label: "Created", val: formatDate(selectedTicket.created_at) },
                        { label: "Messages", val: (selectedTicket.message_count || messages.length || 0).toString() },
                      ].map((r, i) => (
                        <div key={r.label} className={`flex items-center justify-between px-3.5 py-2.5 ${i !== 0 ? "border-t border-outline/5" : ""}`}>
                          <span className="text-[11px] text-on-surface-variant/70">{r.label}</span>
                          <span className="text-[11px] text-on-surface font-medium capitalize">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assignment */}
                  <div>
                    <h5 className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2.5">Assignment</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-surface-container border border-outline/10 rounded-xl cursor-pointer hover:border-primary/30 transition-colors" onClick={handleAssign}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary text-[9px] flex items-center justify-center font-bold text-on-primary">
                            {selectedTicket.assigned_to ? selectedTicket.assigned_to.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span className="text-sm text-on-surface font-medium">{selectedTicket.assigned_to || "Unassigned"}</span>
                        </div>
                        <span className="material-symbols-outlined text-base text-on-surface-variant/60 hover:text-primary">edit</span>
                      </div>
                      <div className="p-3 bg-surface-container border border-outline/10 rounded-xl">
                        <span className="text-sm text-on-surface font-medium block">{selectedTicket.customer_name || "Anonymous"}</span>
                        {selectedTicket.customer_email && <span className="text-[10px] text-on-surface-variant/60">{selectedTicket.customer_email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                      <button onClick={handleResolve} className="w-full py-2.5 border border-outline/10 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all">
                        ✓ Mark Resolved
                      </button>
                    )}
                    <button className="w-full py-2.5 border border-outline/10 bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all">
                      ↑ Escalate to Dev
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
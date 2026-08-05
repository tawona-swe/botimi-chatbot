"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "../ui/Sidebar";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function BotsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);
  const [sources, setSources] = useState([]);
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlSuccess, setCrawlSuccess] = useState("");
  const [trainingData, setTrainingData] = useState(null);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [recrawlLoading, setRecrawlLoading] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", websiteUrl: "" });
  const [createLoading, setCreateLoading] = useState(false);

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
      loadBots();
    }
  }, [isAuthenticated]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("botimiSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  const loadBots = async () => {
    setLoading(true);
    try {
      const data = await api.getBots();
      setBots(data.bots || []);
    } catch (err) {
      console.error("Failed to load bots:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectBot = async (bot) => {
    setSelectedBot(bot);
    setEditMode(false);
    setTestResult(null);
    setTestQuestion("");
    setCrawlUrl("");
    setCrawlSuccess("");
    try {
      const data = await api.getBotSources(bot.id);
      setSources(data.sources || []);
    } catch {
      setSources([]);
    }
    loadTrainingData(bot.id);
  };

  const startEdit = () => {
    setEditForm({
      name: selectedBot.name,
      welcome_message: selectedBot.welcome_message,
      response_tone: selectedBot.response_tone,
      brand_color: selectedBot.brand_color || "#c0c1ff",
      is_active: selectedBot.is_active,
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const data = await api.updateBot(selectedBot.id, editForm);
      setSelectedBot(data.bot);
      setBots(prev => prev.map(b => b.id === selectedBot.id ? { ...b, ...data.bot } : b));
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save bot:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawlLoading(true);
    setCrawlSuccess("");
    try {
      await api.crawlBot(selectedBot.id, crawlUrl);
      setCrawlSuccess(`Crawl started for ${crawlUrl}`);
      setCrawlUrl("");
      // Reload sources after a short delay
      setTimeout(async () => {
        const data = await api.getBotSources(selectedBot.id);
        setSources(data.sources || []);
      }, 2000);
    } catch (err) {
      console.error("Crawl failed:", err);
    } finally {
      setCrawlLoading(false);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    try {
      await api.deleteSource(selectedBot.id, sourceId);
      setSources(prev => prev.filter(s => s.id !== sourceId));
    } catch (err) {
      console.error("Failed to delete source:", err);
    }
  };

  const handleTest = async () => {
    if (!testQuestion.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await api.testBot(selectedBot.id, testQuestion);
      setTestResult(result);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const loadTrainingData = async (botId) => {
    setTrainingLoading(true);
    try {
      const data = await api.getBotTraining(botId);
      setTrainingData(data);
    } catch (err) {
      console.error("Failed to load training data:", err);
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBot) return;
    setUploadLoading(true);
    setUploadSuccess("");
    try {
      await api.uploadBotDocument(selectedBot.id, file);
      setUploadSuccess(`Uploaded and indexed "${file.name}"`);
      loadTrainingData(selectedBot.id);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleRecrawl = async (sourceId) => {
    if (!selectedBot) return;
    setRecrawlLoading(sourceId);
    try {
      await api.recrawlSource(selectedBot.id, sourceId);
      setTimeout(() => loadTrainingData(selectedBot.id), 3000);
    } catch (err) {
      console.error("Recrawl failed:", err);
    } finally {
      setRecrawlLoading(null);
    }
  };

  const handleCreateBot = async () => {
    setCreateLoading(true);
    try {
      await api.createBot(createForm.name || "New Bot", createForm.websiteUrl || undefined);
      setShowCreateModal(false);
      setCreateForm({ name: "", websiteUrl: "" });
      await loadBots();
    } catch (err) {
      console.error("Failed to create bot:", err);
      alert(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredBots = bots.filter(b => {
    if (filter === "active") return b.is_active;
    if (filter === "inactive") return !b.is_active;
    return true;
  });

  const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString();
  };

  const toneColors = { professional: "bg-primary/10 text-primary border-primary/20", friendly: "bg-secondary/10 text-secondary border-secondary/20", concise: "bg-tertiary/10 text-tertiary border-tertiary/20" };

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
      <Sidebar activeLabel="Bots" isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'} max-lg:ml-0 min-h-screen flex flex-col lg:flex-row bg-background text-on-background font-body-md relative transition-all duration-300`}>
        <div className="absolute inset-0 bg-dot pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />

        {/* Bot List Panel */}
        <div className="w-80 max-lg:w-full border-r border-outline-variant flex flex-col bg-surface-container-lowest/80 backdrop-blur-sm lg:shrink-0 max-lg:border-r-0 max-lg:border-b max-lg:max-h-[45vh]">
          <div className="p-5 border-b border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-on-surface">My Bots</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCreateModal(true)} className="px-3 py-1.5 bg-primary text-on-primary rounded-xl text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">add</span>
                  New Bot
                </button>
                <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">{bots.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {["all", "active", "inactive"].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all capitalize ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined text-on-surface-variant animate-spin">sync</span>
                <span className="ml-2 text-sm text-on-surface-variant">Loading bots...</span>
              </div>
            ) : filteredBots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3">smart_toy</span>
                <p className="text-sm text-on-surface-variant">No bots found</p>
                <p className="text-xs text-on-surface-variant/50 mt-1">Create your first bot from Onboarding</p>
              </div>
            ) : (
              filteredBots.map(bot => (
                <div key={bot.id} onClick={() => selectBot(bot)} className={`p-4 border-b border-outline/5 hover:bg-surface-container/50 cursor-pointer transition-all ${selectedBot?.id === bot.id ? "bg-surface-container-low border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${bot.is_active ? "bg-gradient-to-br from-primary to-secondary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                      <span className="material-symbols-outlined text-sm">{bot.avatar_icon || "smart_toy"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-on-surface truncate">{bot.name}</h4>
                      <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${toneColors[bot.response_tone] || toneColors.professional}`}>{bot.response_tone}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${bot.is_active ? "bg-green-400" : "bg-on-surface-variant/30"}`} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                    <span>Created {formatDate(bot.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Bot Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-bold text-on-surface">Create New Bot</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Bot Name</label>
                  <input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer Support Bot" className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Website URL (optional)</label>
                  <input type="url" value={createForm.websiteUrl} onChange={e => setCreateForm(f => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://docs.yourcompany.com" className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                  <p className="text-[10px] text-on-surface-variant/50">If provided, we'll crawl and index your website content automatically.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleCreateBot} disabled={createLoading} className="flex-1 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {createLoading ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span> Creating...</> : "Create Bot"}
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container-highest active:scale-[0.98] transition-all">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bot Detail Panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto scrollbar-thin">
          {!selectedBot ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4">smart_toy</span>
                <p className="text-sm text-on-surface-variant">Select a bot to view and manage</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-8 py-5 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedBot.is_active ? "bg-gradient-to-br from-primary to-secondary" : "bg-surface-container-high"}`}>
                    <span className="material-symbols-outlined text-on-primary text-xl">{selectedBot.avatar_icon || "smart_toy"}</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-on-surface">{selectedBot.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-on-surface-variant">ID: {selectedBot.id?.slice(0, 8)}...</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selectedBot.is_active ? "bg-green-500/10 text-green-400" : "bg-surface-container text-on-surface-variant"}`}>{selectedBot.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={startEdit} className="px-4 py-2 border border-outline-variant bg-surface-container text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all">Edit Bot</button>
                  <button onClick={loadBots} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Edit / Info Panel */}
                <div className="space-y-6">
                  {editMode ? (
                    <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-5">
                      <h3 className="font-display font-bold text-on-surface">Edit Settings</h3>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Bot Name</label>
                        <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Welcome Message</label>
                        <textarea rows={3} value={editForm.welcome_message} onChange={e => setEditForm(f => ({ ...f, welcome_message: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface resize-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Response Tone</label>
                        <select value={editForm.response_tone} onChange={e => setEditForm(f => ({ ...f, response_tone: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface">
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="concise">Concise</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Brand Color</label>
                        <div className="flex items-center gap-3">
                          <input type="color" value={editForm.brand_color} onChange={e => setEditForm(f => ({ ...f, brand_color: e.target.value }))} className="w-10 h-10 rounded-xl border border-outline-variant cursor-pointer bg-transparent" />
                          <span className="text-xs text-on-surface-variant font-mono">{editForm.brand_color}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={!!editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} className="sr-only peer" />
                          <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                        <span className="text-sm text-on-surface font-medium">Bot Active</span>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={saveEdit} disabled={saving} className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50">
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-sm font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4">
                      <h3 className="font-display font-bold text-on-surface">Bot Details</h3>
                      {[
                        { label: "Tone", val: selectedBot.response_tone },
                        { label: "Welcome Message", val: selectedBot.welcome_message },
                        { label: "Color", val: selectedBot.brand_color || "#c0c1ff" },
                        { label: "Widget Position", val: selectedBot.widget_position },
                        { label: "Widget Theme", val: selectedBot.widget_theme },
                        { label: "Created", val: formatDate(selectedBot.created_at) },
                      ].map(r => (
                        <div key={r.label} className="flex items-start justify-between py-1.5 border-b border-outline/5 last:border-0">
                          <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">{r.label}</span>
                          <span className="text-sm text-on-surface text-right max-w-[60%]">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Test Console */}
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4 min-w-0">
                    <h3 className="font-display font-bold text-on-surface">Test Bot</h3>
                    <div className="flex gap-2">
                      <input type="text" value={testQuestion} onChange={e => setTestQuestion(e.target.value)} placeholder="Ask your bot a question..." className="flex-1 min-w-0 bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" onKeyDown={e => e.key === "Enter" && handleTest()} />
                      <button onClick={handleTest} disabled={testLoading || !testQuestion.trim()} className="shrink-0 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-1">
                        {testLoading ? <span className="material-symbols-outlined text-sm animate-spin">sync</span> : <span className="material-symbols-outlined text-sm">play_arrow</span>}
                        Test
                      </button>
                    </div>
                    {testResult && (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 min-w-0 overflow-hidden">
                        {testResult.error ? (
                          <p className="text-sm text-rose-400">{testResult.error}</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xs text-primary">auto_awesome</span>
                              </span>
                              <span className="text-xs text-on-surface-variant">Response</span>
                              {testResult.latencyMs && <span className="text-[10px] text-on-surface-variant/50 ml-auto shrink-0">{(testResult.latencyMs / 1000).toFixed(1)}s</span>}
                            </div>
                            <div className="text-sm text-on-surface leading-relaxed break-words [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-bold [&_strong]:text-on-surface [&_em]:italic [&_a]:text-primary [&_a]:underline [&_code]:bg-surface-container [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-surface-container [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-outline-variant [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-on-surface-variant">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ children }) => (
                                    <div className="my-2 overflow-x-auto scrollbar-thin">
                                      <table className="w-full text-xs border-collapse">{children}</table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-outline-variant bg-surface-container px-2 py-1.5 text-left font-semibold text-on-surface whitespace-nowrap">{children}</th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border border-outline-variant px-2 py-1.5 align-top">{children}</td>
                                  ),
                                }}
                              >
                                {testResult.content || testResult.reply}
                              </ReactMarkdown>
                            </div>
                            {testResult.sources?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-outline/5">
                                <span className="text-[10px] text-on-surface-variant font-semibold uppercase">Sources: {testResult.sources.length}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Training Dashboard */}
                <div className="space-y-6">

                  {/* Health Score */}
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-on-surface">Training Health</h3>
                      {trainingLoading ? (
                        <span className="material-symbols-outlined text-sm text-on-surface-variant animate-spin">sync</span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          (trainingData?.healthScore || 0) >= 80 ? "bg-green-500/10 text-green-400" :
                          (trainingData?.healthScore || 0) >= 40 ? "bg-amber-500/10 text-amber-400" :
                          "bg-rose-500/10 text-rose-400"
                        }`}>
                          Score: {trainingData?.healthScore ?? 0}/100
                        </span>
                      )}
                    </div>
                    {/* Health bar */}
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (trainingData?.healthScore || 0) >= 80 ? "bg-gradient-to-r from-green-400 to-green-500" :
                          (trainingData?.healthScore || 0) >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                          "bg-gradient-to-r from-rose-400 to-rose-500"
                        }`}
                        style={{ width: `${trainingData?.healthScore || 0}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
                        <div className="text-xl font-bold text-on-surface">{trainingData?.totalSources ?? 0}</div>
                        <div className="text-[10px] text-on-surface-variant mt-1">Sources</div>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
                        <div className="text-xl font-bold text-on-surface">{trainingData?.totalChunks ?? 0}</div>
                        <div className="text-[10px] text-on-surface-variant mt-1">Chunks</div>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
                        <div className="text-xl font-bold text-on-surface">{trainingData?.indexedSources ?? 0}</div>
                        <div className="text-[10px] text-on-surface-variant mt-1">Indexed</div>
                      </div>
                    </div>
                  </div>

                  {/* Crawl Panel */}
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-bold text-on-surface">Train Bot</h3>
                    <p className="text-xs text-on-surface-variant">Enter a URL to crawl and index your website content.</p>
                    <div className="flex gap-2">
                      <input type="url" value={crawlUrl} onChange={e => setCrawlUrl(e.target.value)} placeholder="https://docs.yourcompany.com" className="flex-1 min-w-0 bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50" />
                      <button onClick={handleCrawl} disabled={crawlLoading || !crawlUrl.trim()} className="shrink-0 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-1">
                        {crawlLoading ? <span className="material-symbols-outlined text-sm animate-spin">sync</span> : <span className="material-symbols-outlined text-sm">language</span>}
                        Crawl
                      </button>
                    </div>
                    {crawlSuccess && <p className="text-xs text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>{crawlSuccess}</p>}
                  </div>

                  {/* Document Upload */}
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-bold text-on-surface">Upload Documents</h3>
                    <p className="text-xs text-on-surface-variant">Upload PDF, DOCX, or TXT files for your bot to learn from.</p>
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-outline/20 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest/50 transition-all">
                      <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleUpload} disabled={uploadLoading} />
                      {uploadLoading ? (
                        <><span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span><span className="text-sm text-on-surface-variant">Uploading...</span></>
                      ) : (
                        <><span className="material-symbols-outlined text-primary">cloud_upload</span><span className="text-sm text-on-surface-variant">Choose a file to upload</span></>
                      )}
                    </label>
                    {uploadSuccess && <p className="text-xs text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>{uploadSuccess}</p>}
                  </div>

                  {/* Sources List */}
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-on-surface">Knowledge Sources</h3>
                      <span className="text-xs text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-full">{sources.length}</span>
                    </div>
                    {sources.length === 0 ? (
                      <div className="text-center py-8">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/20 mb-2">menu_book</span>
                        <p className="text-xs text-on-surface-variant">No sources yet. Crawl a website or upload a document to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                        {sources.map(source => (
                          <div key={source.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary">
                                  {source.type === "website_crawl" ? "language" : "description"}
                                </span>
                                <h4 className="text-sm font-medium text-on-surface truncate">{source.title || source.url}</h4>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-on-surface-variant flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded-full border ${
                                  source.status === "indexed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                  source.status === "processing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                  source.status === "error" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                  "bg-surface-container text-on-surface-variant border-outline-variant"
                                }`}>{source.status}</span>
                                {source.chunk_count > 0 && <span>{source.chunk_count} chunks</span>}
                                <span>{formatDate(source.created_at)}</span>
                              </div>
                              {source.error_message && <p className="text-[10px] text-rose-400 mt-1">{source.error_message}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {source.type === "website_crawl" && (
                                <button
                                  onClick={() => handleRecrawl(source.id)}
                                  disabled={recrawlLoading === source.id}
                                  className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Recrawl"
                                >
                                  <span className={`material-symbols-outlined text-sm ${recrawlLoading === source.id ? "animate-spin" : ""}`}>
                                    {recrawlLoading === source.id ? "sync" : "refresh"}
                                  </span>
                                </button>
                              )}
                              <button onClick={() => handleDeleteSource(source.id)} className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

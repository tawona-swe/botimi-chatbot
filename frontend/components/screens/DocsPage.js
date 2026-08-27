"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import api from "../../lib/api";

const DEMO_BOT_ID = "demo-bot-static";

const sidebarSections = [
  { id: "getting-started", label: "Getting Started", icon: "rocket_launch" },
  { id: "quick-start", label: "Quick Start Guide", icon: "bolt" },
  { id: "embed-setup", label: "Embed Setup", icon: "code" },
  { id: "training", label: "Training Your Bot", icon: "psychology" },
  { id: "playground", label: "Playground", icon: "smart_toy" },
  { id: "api-reference", label: "API Reference", icon: "api" },
];

const quickReplies = ["Pricing plans", "API docs", "Integrations", "Talk to sales"];

export default function DocsPage() {
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState("getting-started");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Playground state
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "bot", text: "Hey there! I'm your botimi assistant. I can help with pricing, integrations, documentation — pretty much anything. What's on your mind?", time: "10:02 AM" },
  ]);
  const chatRef = useRef(null);
  const demoConvIdRef = useRef(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, isTyping]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("botimi-theme", next ? "dark" : "light"); } catch (e) {}
  };

  const handleSend = async (text) => {
    if (!text?.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { role: "user", text: text.trim(), time: timeStr }]);
    setInputValue("");
    setIsTyping(true);
    try {
      const res = await api.sendMessage(DEMO_BOT_ID, text.trim(), demoConvIdRef.current);
      demoConvIdRef.current = res.conversationId;
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [...prev, { role: "bot", text: res.reply, time: replyTime }]);
    } catch {
      setTimeout(() => {
        const mockReplies = {
          "pricing": "We offer three plans: **Starter ($29/mo)**, **Growth ($79/mo)**, and **Scale ($199/mo)**. Each comes with a 14-day free trial!",
          "pricing plans": "We offer three plans: **Starter ($29/mo)**, **Growth ($79/mo)**, and **Scale ($199/mo)**. Each comes with a 14-day free trial!",
          "api": "Our REST API is fully documented at **docs.botimi.ai**. You'll get API access on Growth and Scale plans.",
          "api docs": "Our REST API is fully documented at **docs.botimi.ai**. You'll get API access on Growth and Scale plans.",
          "integrations": "botimi integrates with **WordPress, Webflow, Shopify, Wix**, and any custom site via a single JS snippet. React/Next.js SDK also available!",
          "hello": "Hi there! 👋 How can I help you today?",
          "hi": "Hey! What can I help you with?",
        };
        const lowerText = text.trim().toLowerCase();
        let reply = "Great question! Let me find the right information for you. Could you tell me a bit more about what you're looking for?";
        for (const [key, val] of Object.entries(mockReplies)) {
          if (lowerText.includes(key)) { reply = val; break; }
        }
        const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setChatMessages((prev) => [...prev, { role: "bot", text: reply, time: replyTime }]);
      }, 1200);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (text) => handleSend(text);

  return (
    <div className={`${isDark ? "dark" : ""} bg-background text-on-background min-h-screen flex flex-col selection:bg-primary/20`}>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
        @keyframes bounceDot {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        .bounce-1 { animation: bounceDot 1.2s infinite 0s; }
        .bounce-2 { animation: bounceDot 1.2s infinite 0.15s; }
        .bounce-3 { animation: bounceDot 1.2s infinite 0.3s; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg { animation: fadeSlide 0.3s ease-out forwards; }
        .docs-content h2 { font-size: 1.5rem; font-weight: 700; color: var(--color-on-surface); margin-bottom: 0.75rem; margin-top: 2rem; }
        .docs-content h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-on-surface); margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .docs-content p { font-size: 0.875rem; color: var(--color-on-surface-variant); line-height: 1.7; margin-bottom: 1rem; }
        .docs-content pre { background: var(--color-surface-container-high); border: 1px solid var(--color-outline-variant); border-radius: 0.75rem; padding: 1rem; overflow-x: auto; font-size: 0.8125rem; margin-bottom: 1rem; }
        .docs-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem; }
        .docs-content ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .docs-content li { font-size: 0.875rem; color: var(--color-on-surface-variant); line-height: 1.7; }
        .docs-content .step-card { background: var(--color-surface-container); border: 1px solid var(--color-outline-variant); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 0.75rem; }
        .docs-content .step-card .step-num { width: 1.75rem; height: 1.75rem; border-radius: 9999px; background: var(--color-primary); color: var(--color-on-primary); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
      `}</style>

      {/* DOCS HEADER — simpler than marketing nav */}
      <header className="border-b border-outline-variant bg-surface-container-low/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile sidebar toggle */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-xl">{sidebarOpen ? "close" : "menu"}</span>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-[10px] text-on-primary font-bold">B</span>
              </div>
              <span className="font-bold text-on-surface text-sm">botimi</span>
              <span className="hidden sm:inline ml-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">Docs</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Toggle theme">
              <span className="material-symbols-outlined text-sm">{isDark ? "light_mode" : "dark_mode"}</span>
            </button>
            <Link href="/" className="hidden sm:inline text-xs text-on-surface-variant hover:text-primary transition-colors">Home</Link>
            <Link href="/register" className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold hover:brightness-110 transition-all">Get Started</Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* SIDEBAR */}
        <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-surface-container-low border-r border-outline-variant overflow-y-auto z-20 transition-transform duration-200 lg:block shrink-0`}>
          <nav className="p-4 space-y-1">
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-outline-variant/50 p-4">
            <Link href="/" className="flex items-center gap-2 text-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Home
            </Link>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-10">
          {/* === GETTING STARTED === */}
          {activeSection === "getting-started" && (
            <div className="docs-content max-w-3xl">
              <h1 className="text-3xl font-bold text-on-surface mb-2">Welcome to botimi</h1>
              <p className="text-on-surface-variant mb-8">Everything you need to deploy AI-powered customer support in minutes.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">timer</span>
                  <p className="text-sm font-semibold text-on-surface">5-min setup</p>
                  <p className="text-xs text-on-surface-variant">From signup to live bot</p>
                </div>
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">devices</span>
                  <p className="text-sm font-semibold text-on-surface">Any platform</p>
                  <p className="text-xs text-on-surface-variant">WordPress, Shopify, React + more</p>
                </div>
                <div className="bg-surface-container border border-outline-variant rounded-xl p-5 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">auto_awesome</span>
                  <p className="text-sm font-semibold text-on-surface">AI-powered</p>
                  <p className="text-xs text-on-surface-variant">Trained on your content</p>
                </div>
              </div>

              <p>botimi is an AI chatbot platform that lets you create a smart, context-aware assistant trained on your own content — website pages, PDFs, documents, and more. Your bot answers customer questions accurately, escalates when needed, and works 24/7.</p>
              <p>To get started, head to the <strong>Quick Start Guide</strong> or jump straight into the <strong>Playground</strong> to try a live demo.</p>
            </div>
          )}

          {/* === QUICK START === */}
          {activeSection === "quick-start" && (
            <div className="docs-content max-w-3xl">
              <h1 className="text-3xl font-bold text-on-surface mb-2">Quick Start Guide</h1>
              <p className="text-on-surface-variant mb-8">Get your first AI chatbot live in under 5 minutes.</p>

              <div className="step-card flex items-start gap-4">
                <div className="step-num">1</div>
                <div>
                  <h3>Create an account</h3>
                  <p className="mb-0!">Sign up at <Link href="/register" className="text-primary hover:underline">botimi.ai/register</Link> with your email or Google account. No credit card required.</p>
                </div>
              </div>

              <div className="step-card flex items-start gap-4">
                <div className="step-num">2</div>
                <div>
                  <h3>Create a bot</h3>
                  <p className="mb-0!">From the dashboard, click <strong>Create Bot</strong>. Give it a name and enter your website URL. botimi will automatically crawl your site.</p>
                </div>
              </div>

              <div className="step-card flex items-start gap-4">
                <div className="step-num">3</div>
                <div>
                  <h3>Train your bot</h3>
                  <p className="mb-0!">Upload PDFs, add URLs, or paste text. Your bot learns from everything you give it. Training takes seconds, not hours.</p>
                </div>
              </div>

              <div className="step-card flex items-start gap-4">
                <div className="step-num">4</div>
                <div>
                  <h3>Test in the Playground</h3>
                  <p className="mb-0!">Use the built-in chat playground to test your bot before going live. Ask it questions and tweak as needed.</p>
                </div>
              </div>

              <div className="step-card flex items-start gap-4">
                <div className="step-num">5</div>
                <div>
                  <h3>Deploy to your site</h3>
                  <p className="mb-0!">Copy a single JavaScript snippet and paste it into your website. Your bot goes live instantly.</p>
                </div>
              </div>
            </div>
          )}

          {/* === EMBED SETUP === */}
          {activeSection === "embed-setup" && (
            <div className="docs-content max-w-3xl">
              <h1 className="text-3xl font-bold text-on-surface mb-2">Embed Setup</h1>
              <p className="text-on-surface-variant mb-8">Add botimi to any website with a single code snippet.</p>

              <h2>1. Get your embed code</h2>
              <p>From your bot dashboard, navigate to <strong>Settings → Embed</strong>. Copy the JavaScript snippet provided.</p>

              <h2>2. Add to your website</h2>
              <p>Paste the snippet just before the closing <code>&lt;/body&gt;</code> tag on every page where you want the chatbot to appear.</p>

              <pre><code>{`<script>
  window.botimiConfig = {
    apiKey: "YOUR_BOT_ID",
    theme: "dark",          // "dark" | "light"
    position: "bottom-right", // "bottom-right" | "bottom-left"
    color: "#c0c1ff",       // accent color
    hideBranding: false     // hide "Powered by botimi"
  };
</script>
<script src="https://your-domain.com/api/widget/loader.js" async></script>`}</code></pre>

              <h2>3. Platform guides</h2>
              <ul>
                <li><strong>WordPress:</strong> Add the snippet via <em>Appearance → Customize → Additional JS</em> or use a plugin.</li>
                <li><strong>Shopify:</strong> Paste in <em>Online Store → Themes → Edit Code → theme.liquid</em> before <code>&lt;/body&gt;</code>.</li>
                <li><strong>Webflow:</strong> Add via <em>Site Settings → Custom Code → Footer Code</em>.</li>
                <li><strong>React / Next.js:</strong> Use <code>dangerouslySetInnerHTML</code> in a useEffect or use our React SDK.</li>
                <li><strong>Any other site:</strong> Paste directly into the HTML template or use Google Tag Manager.</li>
              </ul>
            </div>
          )}

          {/* === TRAINING === */}
          {activeSection === "training" && (
            <div className="docs-content max-w-3xl">
              <h1 className="text-3xl font-bold text-on-surface mb-2">Training Your Bot</h1>
              <p className="text-on-surface-variant mb-8">Feed your bot the knowledge it needs to answer accurately.</p>

              <h2>Website Crawling</h2>
              <p>Enter your website URL and botimi will automatically crawl your pages, extracting content and indexing it for your bot. The crawler respects <code>robots.txt</code> and can handle multi-page sites.</p>

              <h2>Document Upload</h2>
              <p>Upload PDFs, DOCX, or Markdown files. Your bot will extract the text and use it as reference material. Great for product manuals, FAQ documents, and knowledge bases.</p>

              <h2>Manual Text Entry</h2>
              <p>Paste or type custom knowledge directly — perfect for specific Q&amp;A pairs, internal policies, or anything not already in a file or webpage.</p>

              <h2>How It Works</h2>
              <p>botimi uses a Smart Context Engine to process all your sources. When a customer asks a question, the engine finds the most relevant information from your uploaded content and generates an accurate, natural response — no hallucinations, no guesswork.</p>
            </div>
          )}

          {/* === PLAYGROUND (INTERACTIVE DEMO) === */}
          {activeSection === "playground" && (
            <div className="max-w-3xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-on-surface mb-2">Playground</h1>
                <p className="text-on-surface-variant">Try botimi right now — ask questions and see how the AI responds in real time.</p>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container/50 overflow-hidden shadow-sm">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-high border-b border-outline-variant">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary/70" />
                  <span className="ml-3 text-[10px] text-on-surface-variant/50 font-mono">playground.botimi.ai</span>
                </div>

                {/* Chat area */}
                <div className="flex flex-col min-h-[450px]">
                  <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-on-surface">botimi AI</p>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                          <span className="text-[9px] text-primary/80">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" style={{ minHeight: "320px", maxHeight: "400px" }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="max-w-[85%]">
                          {msg.role === "bot" && (
                            <p className="text-[9px] text-on-surface-variant/50 mb-1 ml-0.5">botimi AI</p>
                          )}
                          <div className={`p-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-on-primary rounded-xl rounded-br-sm"
                              : "bg-surface-container-high border border-outline-variant/30 rounded-xl rounded-bl-sm"
                          }`}>
                            {msg.text}
                          </div>
                          <p className={`text-[8px] text-on-surface-variant/30 mt-0.5 ${msg.role === "user" ? "text-right mr-0.5" : "ml-0.5"}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="chat-msg flex justify-start">
                        <div className="p-3 bg-surface-container-high border border-outline-variant/30 rounded-xl rounded-bl-sm flex items-center gap-1">
                          <div className="w-2 h-2 bg-primary/50 rounded-full bounce-1" />
                          <div className="w-2 h-2 bg-primary/50 rounded-full bounce-2" />
                          <div className="w-2 h-2 bg-primary/50 rounded-full bounce-3" />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isTyping && (
                    <div className="shrink-0 px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-thin border-t border-outline-variant/20">
                      {quickReplies.map((text) => (
                        <button key={text} onClick={() => handleQuickReply(text)} className="shrink-0 px-3 py-1.5 text-[10px] font-medium rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-primary hover:border-primary hover:text-on-primary transition-all whitespace-nowrap">
                          {text}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="shrink-0 p-3 border-t border-outline-variant/20 bg-surface-container-low/30 rounded-br-xl">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg pl-3 pr-9 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30"
                          placeholder="Ask me anything..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
                        />
                        <button className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded flex items-center justify-center hover:scale-105 transition-all" onClick={() => handleSend(inputValue)}>
                          <span className="material-symbols-outlined text-[10px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[7px] text-on-surface-variant/25 text-center mt-1.5 tracking-widest uppercase">Powered by botimi AI</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === API REFERENCE === */}
          {activeSection === "api-reference" && (
            <div className="docs-content max-w-3xl">
              <h1 className="text-3xl font-bold text-on-surface mb-2">API Reference</h1>
              <p className="text-on-surface-variant mb-8">Integrate botimi programmatically with our REST API.</p>

              <h2>Authentication</h2>
              <p>All API requests require a valid bot ID (API key) passed in the request body. Your bot ID is available from the dashboard.</p>

              <h2>Send a Chat Message</h2>
              <p>Send a message to a bot and receive an AI-generated response.</p>
              <pre><code>{`POST /api/chat/message

{
  "apiKey": "YOUR_BOT_ID",
  "message": "What are your hours?",
  "conversationId": null
}`}</code></pre>

              <h3>Response</h3>
              <pre><code>{`{
  "reply": "We're open Monday-Friday, 9am-6pm EST.",
  "conversationId": "abc-123"
}`}</code></pre>

              <h2>Rate Limits</h2>
              <p>API requests are rate-limited per bot. Limits vary by plan — Starter: 100 req/min, Growth: 500 req/min, Scale: 2000 req/min.</p>

              <h2>Webhooks</h2>
              <p>Configure webhooks in your dashboard to receive real-time events when conversations escalate to human support.</p>
            </div>
          )}
        </main>
      </div>

      {/* DOCS FOOTER */}
      <footer className="border-t border-outline-variant/30 py-4 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant/40">&copy; 2024 botimi</span>
          <div className="flex gap-4">
            <Link href="/" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Home</Link>
            <Link href="/pricing" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
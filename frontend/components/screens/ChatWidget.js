"use client";

import { useState, useRef, useEffect } from "react";

const messages = [
  { role: "bot", text: "Hey there! I'm your botimi assistant. I can help with pricing, integrations, documentation — pretty much anything. What's on your mind?", time: "10:02 AM" },
  { role: "user", text: "What are your enterprise pricing options?", time: "10:04 AM" },
];

const quickReplies = ["Pricing plans", "API docs", "Integrations", "Talk to sales"];

import api from "../../lib/api";

const DEMO_BOT_ID = "demo-bot-static"; // This would be replaced with real bot ID in production
let demoConvId = null;

export default function ChatWidget() {
  const [isDark, setIsDark] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "bot", text: "Hey there! I'm your botimi assistant. I can help with pricing, integrations, documentation — pretty much anything. What's on your mind?", time: "10:02 AM" },
  ]);
  const chatRef = useRef(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, isTyping]);

  const handleSend = async (text) => {
    if (!text?.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Add user message
    setChatMessages((prev) => [...prev, { role: "user", text: text.trim(), time: timeStr }]);
    setInputValue("");
    setIsTyping(true);

    // Try API call, fall back to mock response
    try {
      const res = await api.sendMessage(DEMO_BOT_ID, text.trim(), demoConvId);
      demoConvId = res.conversationId;
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [...prev, { role: "bot", text: res.reply, time: replyTime }]);
    } catch {
      // Fallback mock responses when API is unavailable
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
          if (lowerText.includes(key)) {
            reply = val;
            break;
          }
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setChatMessages((prev) => [...prev, { role: "bot", text: reply, time: replyTime }]);
      }, 1200);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (text) => {
    handleSend(text);
  };

  return (
    <div className={`${isDark ? "dark" : ""} bg-background text-on-background min-h-screen flex flex-col selection:bg-primary/20`}>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
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
      `}</style>

      <header className="border-b border-outline-variant bg-surface-container-low/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-[10px] text-on-primary font-bold">B</span>
            </div>
            <span className="font-bold text-on-surface text-sm">botimi</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <a href="/dashboard" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Dashboard</a>
            <a href="/support" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Support</a>
            <a href="/onboarding" className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/20 transition-colors">Get Started</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">AI-powered customer support</h1>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-xl mx-auto">See how botimi handles real conversations. Try the widget below.</p>
        </div>

        <div className="relative mx-auto" style={{ maxWidth: "900px" }}>
          <div className="rounded-xl border border-outline-variant bg-surface-container/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-high border-b border-outline-variant">
              <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-tertiary/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-secondary/70" />
              <span className="ml-3 text-[10px] text-on-surface-variant/50 font-mono">app.botimi.ai</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline-variant/30">
              <div className="bg-background p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">dashboard</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface">My Dashboard</p>
                    <p className="text-[10px] text-on-surface-variant/50">Welcome back, Alex</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-surface-container-high border border-outline-variant/50">
                    <p className="text-[10px] text-on-surface-variant/60">Active bots</p>
                    <p className="text-lg font-bold text-on-surface">3</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-high border border-outline-variant/50">
                    <p className="text-[10px] text-on-surface-variant/60">Today</p>
                    <p className="text-lg font-bold text-on-surface">142</p>
                  </div>
                </div>

                <div className="flex-1 rounded-lg bg-surface-container-high border border-outline-variant/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-sm">bar_chart</span>
                    <span className="text-[10px] font-semibold text-on-surface">Conversations</span>
                  </div>
                  <div className="space-y-2">
                    {[60, 40, 80, 55, 70].map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px] text-on-surface-variant/50">
                        <span className="w-6">Mon</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-variant overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${h}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-background flex flex-col min-h-[500px]">
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
                  <button onClick={() => setMinimized(!minimized)} className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-sm">{minimized ? "add" : "remove"}</span>
                  </button>
                </div>

                {!minimized && (
                  <>
                    <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
                            placeholder="Type a message..."
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mt-8 text-[10px] text-on-surface-variant/40">
          <span>No credit card required</span>
          <span className="w-1 h-1 rounded-full bg-on-surface-variant/20" />
          <span>5 min setup</span>
          <span className="w-1 h-1 rounded-full bg-on-surface-variant/20" />
          <span>Cancel anytime</span>
        </div>
      </main>

      <footer className="border-t border-outline-variant/30 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant/40">&copy; 2024 botimi</span>
          <div className="flex gap-4">
            <a href="/" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Home</a>
            <a href="/dashboard" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Dashboard</a>
            <a href="/support" className="text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
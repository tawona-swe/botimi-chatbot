"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useAssistant } from "../../context/AssistantContext";
import api from "../../lib/api";

const GREETING = "Hi! I'm the botimi Dashboard Guide — I can help you find your way around (training bots, embedding, analytics, billing). I'm just here to help you use the dashboard, not a bot you can deploy.";

export default function DashboardAssistant() {
  const router = useRouter();
  const { vendor } = useAuth();
  const { isOpen, toggle, close } = useAssistant();
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, sending, isOpen]);

  if (!vendor) return null;

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const res = await api.assistantChat(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.navigate?.screen) {
        const qs = res.navigate.action ? `?action=${res.navigate.action}` : "";
        router.push(`/${res.navigate.screen}${qs}`);
      }
    } catch (err) {
      setError(err.message || "Couldn't reach the dashboard guide.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[999997] w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:brightness-110 active:scale-[0.96] transition-all"
        aria-label={isOpen ? "Close dashboard guide" : "Open dashboard guide"}
        title="Dashboard Guide"
      >
        <span className="material-symbols-outlined text-[26px]">{isOpen ? "close" : "explore"}</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[999998] w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-140px)] flex flex-col bg-surface-container border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high border-b border-outline-variant">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary shrink-0">explore</span>
              <div className="min-w-0">
                <p className="font-label-md text-label-md text-on-surface font-bold truncate">Dashboard Guide</p>
                <p className="text-[11px] text-on-surface-variant truncate">Helps you use botimi — not deployable</p>
              </div>
            </div>
            <button onClick={close} className="text-on-surface-variant hover:text-on-surface shrink-0" aria-label="Close">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-primary text-on-primary rounded-br-sm"
                  : "bg-surface-container-high text-on-surface rounded-bl-sm"
              }`}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="bg-surface-container-high text-on-surface-variant rounded-2xl rounded-bl-sm px-3 py-2 w-fit text-sm">
                Thinking…
              </div>
            )}
            {error && (
              <p className="text-xs text-error">{error}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-outline-variant">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to do something…"
              className="flex-1 bg-surface-container-high border border-outline-variant rounded-full px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-9 h-9 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

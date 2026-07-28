"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [transitioning, setTransitioning] = useState(true);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [verifyState, setVerifyState] = useState("idle");
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  // API‑integrated state
  const [botId, setBotId] = useState(null);
  const [embedCode, setEmbedCode] = useState("");
  const [embedLoading, setEmbedLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [botName, setBotName] = useState("botimi AI");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! I'm your AI assistant. How can I help you today?");
  const [accentColor, setAccentColor] = useState("#c0c1ff");
  const [crawlStatus, setCrawlStatus] = useState("idle"); // idle | crawling | done | error
  const [crawlError, setCrawlError] = useState("");
  const [onboardingError, setOnboardingError] = useState("");
  const [loadingBots, setLoadingBots] = useState(true);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setTransitioning(false);
      return;
    }
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Load existing bots on mount
  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await api.getBots();
      if (data.bots && data.bots.length > 0) {
        const bot = data.bots[0];
        setBotId(bot.id);
        setBotName(bot.name || "botimi AI");
        setWelcomeMessage(bot.welcome_message || "Hello! I'm your AI assistant. How can I help you today?");
        setAccentColor(bot.brand_color || "#c0c1ff");
        // Fetch embed code
        try {
          setEmbedLoading(true);
          const embedData = await api.getBotEmbed(bot.id);
          setEmbedCode(embedData.embedCode || "");
        } catch (err) {
          console.error("Failed to load embed code:", err);
        } finally {
          setEmbedLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to load bots:", err);
    } finally {
      setLoadingBots(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      // Start crawl if URL provided
      if (websiteUrl && botId) {
        setCrawlStatus("crawling");
        setOnboardingError("");
        try {
          await api.crawlBot(botId, websiteUrl);
          setCrawlStatus("done");
        } catch (err) {
          setCrawlError(err.message);
          setCrawlStatus("error");
          setOnboardingError(err.message);
        }
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Update bot settings
      if (botId) {
        setOnboardingError("");
        try {
          await api.updateBot(botId, {
            name: botName,
            welcome_message: welcomeMessage,
            brand_color: accentColor,
          });
        } catch (err) {
          console.error("Failed to save bot settings:", err);
        }
      }
      setCurrentStep(3);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const copyCode = async () => {
    const code = embedCode || `<script>
  window.botimiConfig = {
    apiKey: "${botId || 'YOUR_BOT_ID'}",
    botId: "${botId || 'YOUR_BOT_ID'}",
    theme: "dark"
  };
</script>
<script async src="https://cdn.botimi.ai/widget.js"></script>`;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Code snippet copied to clipboard!");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const realVerify = async () => {
    if (!botId) return;
    setVerifyState("checking");
    setOnboardingError("");
    try {
      const siteUrl = websiteUrl || (await import("../../lib/api")).default.getBotEmbed(botId).websiteUrl || window.location.origin;
      const result = await api.verifyBotInstall(botId, siteUrl);
      if (result.installed) {
        setVerifyState("verified");
      } else {
        setVerifyState("not-detected");
        setTimeout(() => setVerifyState("idle"), 4000);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setOnboardingError(err.message);
      setVerifyState("idle");
    }
  };

  const totalSteps = 3;
  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const getStepClasses = (step) => {
    if (step === currentStep) {
      return `step-transition ${transitioning ? "opacity-0 translate-y-4" : ""}`;
    }
    return "step-transition hidden opacity-0 translate-y-4";
  };

  const stepIcons = ["smart_toy", "palette", "rocket_launch"];

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col selection:bg-primary/20">
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .step-transition {
            transition: opacity 0.35s ease-in-out, transform 0.35s ease-in-out;
        }
        .glow-primary {
            box-shadow: 0 0 40px rgba(192, 193, 255, 0.08);
        }
        .glow-card {
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
        }
        .glow-card:hover {
            box-shadow: 0 4px 24px rgba(192, 193, 255, 0.12);
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #c0c1ff;
            box-shadow: 0 0 0 3px rgba(192, 193, 255, 0.15);
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(1deg); }
        }
        .float-anim {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .shimmer {
            background: linear-gradient(90deg, transparent 0%, rgba(192, 193, 255, 0.05) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 3s ease-in-out infinite;
        }
        .verify-pulse {
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
            animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5); }
            70% { box-shadow: 0 0 0 12px rgba(74, 222, 128, 0); }
            100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        .stepper-dot {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stepper-line {
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <header className="bg-background/90 backdrop-blur-md border-b border-outline-variant sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 lg:px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-on-primary text-xs font-bold">B</span>
            </div>
            <a href="/" className="font-display text-headline-md font-extrabold text-primary">botimi</a>
            <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant">Setup</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm text-on-surface-variant">Need help?</span>
            <a href="/support" className="text-sm text-primary font-semibold hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 relative overflow-hidden">
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-2xl mt-8 mb-10 z-10 px-2">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-5 left-0 w-full h-[2px] bg-surface-container-highest -translate-y-1/2 z-0" />
            <div
              className="absolute top-5 left-0 h-[2px] bg-gradient-to-r from-primary to-secondary -translate-y-1/2 z-0 stepper-line"
              style={{ width: `${progressWidth}%` }}
            />
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`stepper-dot w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    step <= currentStep
                      ? "bg-gradient-to-br from-primary to-secondary text-on-primary shadow-lg shadow-primary/30"
                      : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                  }`}
                >
                  {step < currentStep ? (
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">{stepIcons[step - 1]}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    step <= currentStep ? "text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {step === 1 ? "Train" : step === 2 ? "Customize" : "Deploy"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-4xl bg-surface-container/80 backdrop-blur-sm border border-outline-variant rounded-2xl overflow-hidden glow-primary z-10">
          <div className="p-6 sm:p-8 lg:p-10 min-h-[520px] flex flex-col" id="wizard-content">

            <section className={getStepClasses(1)}>
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 mb-4">
                    <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                    <span className="text-xs font-semibold text-primary">Step 1 of 3</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl text-on-surface font-bold">Feed your bot knowledge</h1>
                  <p className="text-on-surface-variant mt-2 max-w-lg mx-auto">Upload docs or connect a URL so your bot understands your business inside out.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="group relative p-6 bg-surface-container-high border border-outline-variant rounded-xl hover:border-primary/50 transition-all duration-300 glow-card">
                    <div className="shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-primary">language</span>
                      </div>
                      <h3 className="font-headline-md text-on-surface mb-2">Crawl Website</h3>
                      <p className="text-sm text-on-surface-variant mb-5">Enter your docs or homepage URL and let botimi index it automatically.</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">link</span>
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant pl-9 pr-3 py-2.5 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50"
                          placeholder="https://docs.yourcompany.com"
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                        {crawlStatus === "crawling" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-secondary animate-spin">sync</span>
                        )}
                        {crawlStatus === "done" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                      </div>
                      {crawlStatus === "crawling" && (
                        <p className="mt-2 text-xs text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">sync</span>
                          Crawling your website...
                        </p>
                      )}
                      {crawlStatus === "error" && (
                        <p className="mt-2 text-xs text-rose-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">error</span>
                          {crawlError || "Crawl failed. You can continue without crawling."}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="group relative p-6 bg-surface-container-high border-2 border-dashed border-outline-variant rounded-xl hover:border-primary/50 hover:bg-surface-container-highest transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center glow-card">
                    <div className="shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-secondary text-2xl">cloud_upload</span>
                      </div>
                      <h3 className="font-headline-md text-on-surface">Upload Documents</h3>
                      <p className="text-sm text-on-surface-variant mt-1">PDF, DOCX or Markdown files.</p>
                      <span className="mt-4 text-sm text-primary font-semibold bg-primary/10 px-4 py-1.5 rounded-full group-hover:bg-primary/20 transition-colors">Browse files</span>
                    </div>
                    <input
                      className="hidden"
                      id="file-upload"
                      type="file"
                      accept=".pdf,.docx,.md,.txt"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <div
                  className={`transition-all duration-500 overflow-hidden ${selectedFileName ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface font-medium truncate">{selectedFileName || ""}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000" style={{ width: "100%" }} />
                        </div>
                        <span className="text-xs text-primary font-semibold">100%</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-green-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={getStepClasses(2)}>
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 mb-4">
                    <span className="material-symbols-outlined text-primary text-sm">palette</span>
                    <span className="text-xs font-semibold text-primary">Step 2 of 3</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl text-on-surface font-bold">Customize your bot</h1>
                  <p className="text-on-surface-variant mt-2 max-w-lg mx-auto">Set the name, tone, and look that matches your brand.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Bot Name</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">badge</span>
                        <input
                          className="w-full bg-surface-container-lowest border border-outline-variant pl-9 pr-3 py-2.5 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50"
                          type="text"
                          value={botName}
                          onChange={(e) => setBotName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Welcome Message</label>
                      <textarea
                        className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none"
                        rows="3"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Accent Color</label>
                      <div className="flex gap-3 flex-wrap">
                        {["#c0c1ff", "#4cd7f6", "#ffb783", "#f87171", "#a78bfa", "#34d399", "#fbbf24"].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-9 h-9 rounded-xl transition-all duration-200 hover:scale-110 hover:ring-2 ring-white/30 ${
                              color === accentColor ? "ring-2 ring-white scale-110" : ""
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setAccentColor(color)}
                          />
                        ))}
                        <div className="w-9 h-9 rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant">add</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-3 bg-gradient-to-b from-surface-container-lowest to-surface-container-low rounded-xl border border-outline-variant p-6 flex items-center justify-center relative min-h-[420px] overflow-hidden">
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-on-surface-variant/60">
                      <span className="material-symbols-outlined text-sm">preview</span> Live Preview
                    </div>
                    <div className="w-[300px] bg-surface-container-high rounded-xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col float-anim">
                      <div className="bg-gradient-to-r from-primary to-secondary/80 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center">
                          <span className="text-on-primary text-sm font-bold">B</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-on-primary">botimi Assistant</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] text-on-primary/70">Online</span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-on-primary/60 text-sm">more_vert</span>
                      </div>
                      <div className="p-4 space-y-3.5 flex-grow min-h-[180px] flex flex-col justify-end bg-surface-container-lowest">
                        <div className="bg-surface-variant/50 p-3 rounded-xl rounded-bl-none text-sm text-on-surface max-w-[85%]">
                          Hello! I&apos;m your AI assistant. How can I help you today?
                        </div>
                        <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl rounded-br-none text-sm text-on-surface self-end max-w-[85%]">
                          What can you do?
                        </div>
                        <div className="bg-surface-variant/30 p-2 rounded-xl rounded-bl-none text-xs text-on-surface-variant max-w-[60%] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                      <div className="p-3 border-t border-outline-variant bg-surface-container flex items-center gap-2">
                        <div className="flex-1 bg-surface-container-lowest rounded-lg px-3.5 py-2 text-xs text-on-surface-variant/60">Type a message...</div>
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-xs text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={getStepClasses(3)}>
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 mb-4">
                    <span className="material-symbols-outlined text-primary text-sm">rocket_launch</span>
                    <span className="text-xs font-semibold text-primary">Step 3 of 3</span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl text-on-surface font-bold">Deploy to your site</h1>
                  <p className="text-on-surface-variant mt-2 max-w-lg mx-auto">Add this snippet to your website and your bot goes live instantly.</p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden group">
                  <div className="flex justify-between items-center px-5 py-3 bg-surface-variant border-b border-outline-variant">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-error/80" />
                      <span className="w-3 h-3 rounded-full bg-tertiary/80" />
                      <span className="w-3 h-3 rounded-full bg-secondary/80" />
                      <span className="ml-2 text-xs text-on-surface-variant font-mono">embed.html</span>
                    </div>
                    <button
                      type="button"
                      className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        copied
                          ? "bg-green-500/20 text-green-400"
                          : "text-primary hover:bg-primary/10"
                      }`}
                      onClick={copyCode}
                    >
                      <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                      {copied ? "Copied!" : "Copy code"}
                    </button>
                  </div>
                  <pre className="p-5 text-sm text-on-surface overflow-x-auto hide-scrollbar" style={{backgroundColor: "var(--code-bg)"}}>
                    <code>{embedLoading ? "Loading embed code..." : (embedCode || `<script>
  window.botimiConfig = {
    apiKey: "${botId || 'YOUR_BOT_ID'}",
    botId: "${botId || 'YOUR_BOT_ID'}",
    theme: "dark"
  };
</script>
<script async src="https://cdn.botimi.ai/widget.js"></script>`)}</code>
                  </pre>
                </div>
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">published_with_changes</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">Your Bot ID</h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-mono">{botId || "Loading..."}</p>
                  </div>
                </div>
                <div className="p-5 bg-secondary/5 border border-secondary/20 rounded-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">bolt</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">Instant Activation</h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">No waiting — your bot becomes available as soon as the snippet loads.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`w-full h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                    verifyState === "verified"
                      ? "bg-green-500/10 border border-green-500/40 text-green-400 verify-pulse"
                      : verifyState === "not-detected"
                      ? "bg-amber-500/10 border border-amber-500/40 text-amber-400"
                      : "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]"
                  }`}
                  onClick={realVerify}
                  disabled={verifyState === "checking" || verifyState === "verified"}
                >
                  {verifyState === "idle" && (
                    <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>double_arrow</span> Verify Installation</>
                  )}
                  {verifyState === "checking" && (
                    <><span className="material-symbols-outlined animate-spin">sync</span> Checking connection...</>
                  )}
                  {verifyState === "verified" && (
                    <><span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Connected & Live</>
                  )}
                  {verifyState === "not-detected" && (
                    <><span className="material-symbols-outlined text-amber-400">visibility_off</span> Not detected - try again</>
                  )}
                </button>
              </div>
            </section>

            <div className="mt-auto pt-8 flex justify-between items-center border-t border-outline-variant/20">
              {onboardingError && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg px-4 py-2 flex items-center gap-2 max-w-md">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {onboardingError}
                </div>
              )}
              <button
                type="button"
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-variant transition-all flex items-center gap-1.5 ${currentStep === 1 ? "invisible" : ""}`}
                onClick={prevStep}
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-on-surface-variant/60">Step {currentStep} of {totalSteps}</span>
                <button
                  type="button"
                  className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${
                    currentStep === totalSteps
                      ? "bg-secondary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]"
                      : "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]"
                  }`}
                  onClick={nextStep}
                >
                  {currentStep === totalSteps ? "Finish Setup" : "Continue"}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center z-10">
          <span className="text-xs text-on-surface-variant/50">Secure setup · No credit card required · 5 min deployment</span>
        </div>
      </main>

      <footer className="bg-surface-container-lowest/80 border-t border-outline-variant py-6 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 lg:px-margin-desktop max-w-container-max mx-auto w-full gap-4">
          <span className="text-xs text-on-surface-variant/60">&copy; 2024 botimi AI Ecosystem. All rights reserved.</span>
          <div className="flex gap-6">
            <a className="text-xs text-on-surface-variant/80 hover:text-primary transition-colors" href="/dashboard">Dashboard</a>
            <a className="text-xs text-on-surface-variant/80 hover:text-primary transition-colors" href="/support">Support</a>
            <a className="text-xs text-on-surface-variant/80 hover:text-primary transition-colors" href="/docs">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

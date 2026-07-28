"use client";

import { useState, useRef } from "react";

export default function OnboardingRedesign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlActive, setCrawlActive] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [verifyState, setVerifyState] = useState("idle");
  const [copied, setCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#c0c1ff");
  const intervalRef = useRef(null);

  const totalSteps = 3;

  const getStepDotClasses = (step) => {
    if (step < currentStep) return "w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500 text-white font-bold transition-all duration-300 ring-4 ring-background";
    if (step === currentStep) return "w-12 h-12 rounded-2xl flex items-center justify-center bg-primary text-on-primary font-bold ai-glow transition-all duration-300 ring-4 ring-background";
    return "w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-container-highest text-on-surface-variant font-bold transition-all duration-300 ring-4 ring-background";
  };

  const getStepIcon = (step) => {
    if (step < currentStep) return "check";
    if (step === 1) return "psychology";
    if (step === 2) return "palette";
    return "bolt";
  };

  const getStepLabelClasses = (step) => {
    if (step < currentStep) return "font-display text-sm font-bold text-green-500";
    if (step === currentStep) return "font-display text-sm font-bold text-primary";
    return "font-display text-sm font-bold text-on-surface-variant";
  };

  const getProgressWidth = () => {
    if (currentStep === 1) return "0%";
    if (currentStep === 2) return "50%";
    return "100%";
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
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
    const code = `<script>
  window.botimiConfig = {
    apiKey: "bh_9823x_prod_kll2",
    botId: "asst_9x2100",
    theme: "indigo-dark"
  };
</script>
<script async src="https://cdn.botimi.ai/v1/widget.js"></script>`;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("botimi code snippet copied to clipboard!");
    }
  };

  const startCrawl = () => {
    if (!crawlUrl) return;
    setCrawlActive(true);
    setCrawlProgress(0);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCrawlProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15);
        if (next >= 100) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 100;
        }
        return next;
      });
    }, 400);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const simulateVerify = () => {
    setVerifyState("checking");
    setTimeout(() => {
      setVerifyState("verified");
    }, 2500);
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col selection:bg-primary/30">
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .step-transition {
            transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ai-glow {
            box-shadow: 0 0 40px -10px rgba(192, 193, 255, 0.2);
        }
        .glass-panel {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
        }
        .stepper-line-active {
            background: linear-gradient(90deg, #c0c1ff 0%, #a855f7 100%);
        }
        .neon-border:hover {
            border-color: #c0c1ff;
            box-shadow: 0 0 15px rgba(192, 193, 255, 0.1);
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        .animate-pulse-glow {
            animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <header className="bg-background/80 backdrop-blur-md border-b border-outline-variant sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-stack-sm">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">hub</span>
            </div>
            <a href="/" className="font-display text-headline-md font-extrabold tracking-tight text-on-surface">botimi</a>
            <span className="text-primary font-label-md bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 ml-2">Setup Wizard</span>
          </div>
          <div className="hidden md:flex items-center gap-stack-lg">
            <span className="text-on-surface-variant font-label-md">Onboarding phase: {currentStep}/{totalSteps}</span>
            <a href="/support" className="text-on-surface hover:text-primary transition-colors font-medium">Support</a>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center pb-12 px-margin-mobile relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-3xl mb-12 z-10">
          <div className="flex justify-between items-start relative px-4">
            <div className="absolute top-6 left-0 w-full h-[2px] bg-outline/20 -translate-y-1/2 z-0"></div>
            <div className="absolute top-6 left-0 h-[2px] stepper-line-active -translate-y-1/2 z-0 transition-all duration-700" style={{ width: getProgressWidth() }}></div>

            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center gap-3 group">
                <div className={getStepDotClasses(step)}>
                  <span className="material-symbols-outlined">{getStepIcon(step)}</span>
                </div>
                <div className="text-center">
                  <p className={getStepLabelClasses(step)}>
                    {step === 1 ? "Knowledge Core" : step === 2 ? "Bot Persona" : "Deployment"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">Step {step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-5xl glass-panel rounded-2xl overflow-hidden ai-glow z-10 border border-outline-variant flex flex-col">
          <div className="p-8 md:p-12 min-h-[520px] flex-grow">
            {currentStep === 1 && (
              <section className="step-transition">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <h1 className="font-display text-headline-lg text-on-surface tracking-tight">Intelligence Training</h1>
                    <p className="text-on-surface-variant mt-3 text-body-lg max-w-xl mx-auto">Sync your documentation to build a custom knowledge base for your AI assistant.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group p-8 bg-surface-container-low border border-outline-variant rounded-2xl hover:border-primary/50 transition-all duration-300 flex flex-col">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-primary text-3xl">language</span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-on-surface mb-2">Automated Crawl</h3>
                      <p className="text-body-sm text-on-surface-variant mb-8 flex-grow">Provide a URL and we'll automatically scrape and index all relevant documentation pages.</p>
                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            className="w-full bg-background/50 border border-outline/20 p-4 pr-12 rounded-xl text-on-surface focus:border-primary transition-all placeholder:text-outline"
                            placeholder="https://docs.yourcompany.com"
                            type="url"
                            value={crawlUrl}
                            onChange={(e) => setCrawlUrl(e.target.value)}
                            id="crawl-input"
                          />
                          <button
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-white transition-colors p-1"
                            onClick={startCrawl}
                          >
                            <span className="material-symbols-outlined">arrow_forward</span>
                          </button>
                        </div>
                        <div className={crawlActive ? "space-y-3" : "hidden space-y-3"} id="crawl-status">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-primary font-medium animate-pulse">
                              {crawlProgress >= 100 ? "Complete!" : "Indexing pages..."}
                            </span>
                            <span className="text-on-surface-variant" id="crawl-percent">{crawlProgress}%</span>
                          </div>
                          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-500" id="crawl-bar" style={{ width: `${crawlProgress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="group p-8 bg-surface-container-low border border-outline-variant border-dashed rounded-2xl hover:bg-surface-container-high transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center">
                      <input
                        className="hidden"
                        id="file-upload"
                        multiple
                        type="file"
                        onChange={handleFileUpload}
                      />
                      <label className="w-full h-full cursor-pointer flex flex-col items-center" htmlFor="file-upload">
                        <div className="w-12 h-12 bg-on-surface-variant/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-3xl transition-colors">upload_file</span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-on-surface mb-2">Upload Files</h3>
                        <p className="text-body-sm text-on-surface-variant mb-6">Drag and drop your PDF, DOCX or MD files here (Max 50MB per file)</p>
                        <span className="px-6 py-2 bg-background border border-outline/20 rounded-lg text-sm font-medium group-hover:border-primary/50 transition-colors">Browse computer</span>
                      </label>
                      <div className={uploadedFiles.length > 0 ? "w-full mt-6 space-y-2 text-left" : "hidden w-full mt-6 space-y-2 text-left"} id="upload-list">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="p-3 bg-background rounded-lg border border-outline-variant flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-sm">description</span>
                            <span className="text-xs text-on-surface flex-grow truncate">{file.name}</span>
                            <span className="material-symbols-outlined text-xs text-green-500">check_circle</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="step-transition">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-8">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-on-surface tracking-tight">Identity & Persona</h2>
                      <p className="text-on-surface-variant text-sm mt-2">Define how your bot introduces itself to users.</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Bot Identity Name</label>
                        <input className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-on-surface focus:border-primary outline-none" type="text" defaultValue="HiveAssistant" />
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Welcome Prompt</label>
                        <textarea className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-on-surface focus:border-primary outline-none" rows="3" defaultValue="Hi there! 👋 I'm your dedicated AI assistant. How can I help you today?"></textarea>
                      </div>
                      <div className="space-y-3">
                        <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Brand Color Profile</label>
                        <div className="flex flex-wrap gap-3">
                          {["#c0c1ff", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899"].map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-10 h-10 rounded-xl ${selectedColor === color ? "ring-2 ring-primary ring-offset-4 ring-offset-surface-container shadow-lg" : ""} hover:scale-110 transition-transform`}
                              style={{ backgroundColor: color }}
                              onClick={() => setSelectedColor(color)}
                            ></button>
                          ))}
                          <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/20 flex items-center justify-center cursor-pointer hover:border-primary">
                            <span className="material-symbols-outlined text-sm">colorize</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-background/50 rounded-2xl border border-outline-variant p-8 flex flex-col items-center justify-center relative min-h-[440px]">
                    <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-full border border-outline-variant">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Live Widget Preview</span>
                    </div>
                    <div className="w-[340px] bg-surface-container border border-outline-variant rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transform hover:scale-[1.02] transition-transform">
                      <div className="bg-primary p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-on-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary">smart_toy</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-on-primary">HiveAssistant</h4>
                            <span className="text-[10px] text-on-primary/70">Online & Ready</span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-on-primary/50 text-sm">close</span>
                      </div>
                      <div className="p-5 space-y-4 flex-grow h-48 bg-surface-container-highest/30">
                        <div className="bg-surface-container p-3 rounded-2xl rounded-bl-none text-xs text-on-surface max-w-[85%] border border-outline-variant">
                          Hi there! 👋 I'm your dedicated AI assistant. How can I help you today?
                        </div>
                        <div className="bg-primary/20 border border-primary/30 p-3 rounded-2xl rounded-br-none text-xs text-on-surface self-end max-w-[85%]">
                          Tell me about your pricing plans.
                        </div>
                      </div>
                      <div className="p-4 bg-surface-container border-t border-outline-variant flex gap-3">
                        <div className="flex-grow bg-background rounded-lg px-4 py-2 text-xs text-on-surface-variant border border-outline/5 italic">Type a message...</div>
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                          <span className="material-symbols-outlined text-sm">send</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section className="step-transition">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="mb-10">
                    <h2 className="font-display text-3xl font-bold text-on-surface tracking-tight">Deploy to Production</h2>
                    <p className="text-on-surface-variant mt-3">Integration complete. Add this script tag to your website header to activate botimi.</p>
                  </div>
                  <div className="bg-background border border-outline/20 rounded-2xl overflow-hidden text-left mb-10 group">
                    <div className="flex justify-between items-center px-6 py-4 bg-surface-container-highest/30 border-b border-outline/20">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500/50"></span>
                        <span className="w-3 h-3 rounded-full bg-yellow-500/50"></span>
                        <span className="w-3 h-3 rounded-full bg-green-500/50"></span>
                        <span className="ml-2 font-label-md text-xs text-on-surface-variant">index.html</span>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-2 text-primary font-bold text-xs hover:text-white transition-colors"
                        onClick={copyCode}
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copied ? "Copied!" : "Copy Snippet"}
                      </button>
                    </div>
                    <pre className="p-6 font-code-sm text-sm text-on-surface leading-relaxed overflow-x-auto hide-scrollbar" style={{backgroundColor: "var(--code-bg)"}}><code>{`<script>
  window.botimiConfig = {
    apiKey: "bh_9823x_prod_kll2",
    botId: "asst_9x2100",
    theme: "indigo-dark"
  };
</script>
<script async src="https://cdn.botimi.ai/v1/widget.js"></script>`}</code></pre>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-4 text-left">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary">published_with_changes</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">Auto-Verification</h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-normal">Our system will ping your domain automatically once the script is detected.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`w-full h-full flex flex-col items-center justify-center p-6 rounded-2xl transition-all group ${
                        verifyState === "verified"
                          ? "bg-green-500/5 border border-green-500/50"
                          : "bg-surface-container-low border border-outline-variant hover:border-primary"
                      }`}
                      id="verify-btn"
                      onClick={simulateVerify}
                      disabled={verifyState === "checking" || verifyState === "verified"}
                    >
                      {verifyState === "idle" && (
                        <>
                          <span className="material-symbols-outlined text-2xl mb-2 group-hover:rotate-180 transition-transform duration-500">sync</span>
                          <span className="font-bold">Verify Live Status</span>
                        </>
                      )}
                      {verifyState === "checking" && (
                        <>
                          <span className="material-symbols-outlined animate-spin text-2xl mb-2">sync</span>
                          <span className="font-bold">Verifying Connection...</span>
                        </>
                      )}
                      {verifyState === "verified" && (
                        <>
                          <span className="material-symbols-outlined text-green-500 text-2xl mb-2">verified</span>
                          <span className="font-bold text-green-500">Live & Connected</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="px-8 py-6 bg-surface-container-highest/20 border-t border-outline-variant flex justify-between items-center">
            <button
              type="button"
              className={`px-6 py-2.5 rounded-xl font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all ${currentStep === 1 ? "invisible" : ""}`}
              id="back-btn"
              onClick={prevStep}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </div>
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={`px-10 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 ai-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 group ${
                  currentStep === totalSteps ? "bg-green-500" : ""
                }`}
                id="next-btn"
                onClick={nextStep}
              >
                <span>{currentStep === totalSteps ? "Go to Dashboard" : "Continue"}</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-surface-container-lowest/50 border-t border-outline/5 py-8 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto w-full gap-4">
          <div className="flex items-center gap-4">
            <span className="font-body-sm text-on-surface-variant">© 2024 botimi Intelligence. Built for the modern web.</span>
          </div>
          <div className="flex gap-8">
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="/dashboard">Dashboard</a>
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="/support">Support</a>
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="/docs">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

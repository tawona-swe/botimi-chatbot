"use client"

import { useState, useCallback } from "react"

export default function OnboardingStep2() {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const [verifyState, setVerifyState] = useState("idle")

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    } else {
      window.location.href = "/dashboard"
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [])

  const copyCode = useCallback(() => {
    alert("botimi code snippet copied to clipboard!")
  }, [])

  const simulateVerify = useCallback(() => {
    setVerifyState("verifying")
    setTimeout(() => {
      setVerifyState("verified")
    }, 2500)
  }, [])

  const getStepState = (step) => {
    if (step < currentStep) return "completed"
    if (step === currentStep) return "active"
    return "upcoming"
  }

  const getDotClasses = (step) => {
    const state = getStepState(step)
    const base = "w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ring-4 ring-background"
    if (state === "completed") return `${base} bg-green-500 text-white`
    if (state === "active") return `${base} bg-primary text-on-primary ai-glow`
    return `${base} bg-surface-container-highest text-on-surface-variant`
  }

  const getLabelClasses = (step) => {
    const state = getStepState(step)
    const base = "font-display text-sm font-bold"
    if (state === "completed") return `${base} text-green-500`
    if (state === "active") return `${base} text-primary`
    return `${base} text-on-surface-variant`
  }

  const getIcon = (step) => {
    const state = getStepState(step)
    if (state === "completed") return "check"
    if (state === "active") {
      if (step === 1) return "psychology"
      if (step === 2) return "palette"
      return "bolt"
    }
    if (step === 2) return "palette"
    return "bolt"
  }

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
      <header className="bg-background/80 backdrop-blur-md border-b border-outline/10 sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-stack-sm">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">hub</span>
            </div>
            <a href="/" className="font-display text-headline-md font-extrabold tracking-tight text-on-surface">botimi</a>
            <span className="text-primary font-label-md bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 ml-2">Setup Wizard</span>
          </div>
          <div className="hidden md:flex items-center gap-stack-lg">
            <span className="text-on-surface-variant font-label-md">Onboarding phase: 2/3</span>
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
            <div
              className="absolute top-6 left-0 h-[2px] stepper-line-active -translate-y-1/2 z-0 transition-all duration-700"
              style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
            ></div>
            <div className="relative z-10 flex flex-col items-center gap-3 group">
              <div className={getDotClasses(1)} id="step-dot-1">
                <span className="material-symbols-outlined">{getIcon(1)}</span>
              </div>
              <div className="text-center">
                <p className={getLabelClasses(1)} id="step-label-1">Knowledge Core</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">Step 1</p>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3 group">
              <div className={getDotClasses(2)} id="step-dot-2">
                <span className="material-symbols-outlined">{getIcon(2)}</span>
              </div>
              <div className="text-center">
                <p className={getLabelClasses(2)} id="step-label-2">Bot Persona</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">Step 2</p>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3 group">
              <div className={getDotClasses(3)} id="step-dot-3">
                <span className="material-symbols-outlined" id="step-icon-3">{getIcon(3)}</span>
              </div>
              <div className="text-center">
                <p className={getLabelClasses(3)} id="step-label-3">Deployment</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">Step 3</p>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full max-w-5xl glass-panel rounded-2xl overflow-hidden ai-glow z-10 border border-outline/10 flex flex-col">
          <div className="p-8 md:p-12 min-h-[520px] flex-grow" id="wizard-content">
            <section className={`step-transition ${currentStep !== 1 ? "hidden opacity-0 translate-y-8" : ""}`} id="step-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-on-surface tracking-tight">Bot Persona</h2>
                    <p className="text-on-surface-variant text-sm mt-2">Define how your bot introduces itself and interacts with users.</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Bot Name</label>
                      <input className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-on-surface focus:border-primary outline-none" type="text" defaultValue="botimi AI" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Bot Avatar</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-dashed border-primary/30 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-primary">add_a_photo</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center cursor-pointer border border-primary">
                            <span className="material-symbols-outlined text-primary">smart_toy</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center cursor-pointer border border-outline/10">
                            <span className="material-symbols-outlined text-on-surface-variant">support_agent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Response Tone</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button className="p-3 rounded-xl border border-primary bg-primary/10 text-primary text-xs font-bold">Professional</button>
                        <button className="p-3 rounded-xl border border-outline/10 bg-surface-container-low text-on-surface-variant text-xs font-bold hover:border-primary/50">Friendly</button>
                        <button className="p-3 rounded-xl border border-outline/10 bg-surface-container-low text-on-surface-variant text-xs font-bold hover:border-primary/50">Concise</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant">Welcome Message</label>
                      <textarea className="w-full bg-surface-container-low border border-outline/20 p-4 rounded-xl text-on-surface focus:border-primary outline-none" rows="3" defaultValue="Hello! I've analyzed your documentation. How can I help you today?"></textarea>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 bg-background/50 rounded-2xl border border-outline/10 p-8 flex flex-col items-center justify-center relative min-h-[440px]">
                  <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-full border border-outline/10">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Live Widget Preview</span>
                  </div>
                  <div className="w-[340px] bg-surface-container border border-outline/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transform hover:scale-[1.02] transition-transform">
                    <div className="bg-primary p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-on-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary">smart_toy</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-on-primary">botimi AI</h4>
                          <span className="text-[10px] text-on-primary/70">Online &amp; Ready</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-primary/50 text-sm">close</span>
                    </div>
                    <div className="p-5 space-y-4 flex-grow h-48 bg-surface-container-highest/30">
                      <div className="bg-surface-container p-3 rounded-2xl rounded-bl-none text-xs text-on-surface max-w-[85%] border border-outline/10">Hello! I&apos;ve analyzed your documentation. How can I help you today?</div>
                    </div>
                    <div className="p-4 bg-surface-container border-t border-outline/10 flex gap-3">
                      <div className="flex-grow bg-background rounded-lg px-4 py-2 text-xs text-on-surface-variant border border-outline/5 italic">Type a message...</div>
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                        <span className="material-symbols-outlined text-sm">send</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className={`step-transition ${currentStep !== 2 ? "hidden opacity-0 translate-y-8" : ""}`} id="step-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-on-surface tracking-tight">Identity &amp; Persona</h2>
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
                        <button className="w-10 h-10 rounded-xl bg-[#c0c1ff] ring-2 ring-primary ring-offset-4 ring-offset-surface-container shadow-lg"></button>
                        <button className="w-10 h-10 rounded-xl bg-[#0ea5e9] hover:scale-110 transition-transform"></button>
                        <button className="w-10 h-10 rounded-xl bg-[#10b981] hover:scale-110 transition-transform"></button>
                        <button className="w-10 h-10 rounded-xl bg-[#f59e0b] hover:scale-110 transition-transform"></button>
                        <button className="w-10 h-10 rounded-xl bg-[#ec4899] hover:scale-110 transition-transform"></button>
                        <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/20 flex items-center justify-center cursor-pointer hover:border-primary">
                          <span className="material-symbols-outlined text-sm">colorize</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 bg-background/50 rounded-2xl border border-outline/10 p-8 flex flex-col items-center justify-center relative min-h-[440px]">
                  <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-full border border-outline/10">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Live Widget Preview</span>
                  </div>
                  <div className="w-[340px] bg-surface-container border border-outline/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transform hover:scale-[1.02] transition-transform">
                    <div className="bg-primary p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-on-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary">smart_toy</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-on-primary">HiveAssistant</h4>
                          <span className="text-[10px] text-on-primary/70">Online &amp; Ready</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-primary/50 text-sm">close</span>
                    </div>
                    <div className="p-5 space-y-4 flex-grow h-48 bg-surface-container-highest/30">
                      <div className="bg-surface-container p-3 rounded-2xl rounded-bl-none text-xs text-on-surface max-w-[85%] border border-outline/10">Hi there! 👋 I&apos;m your dedicated AI assistant. How can I help you today?</div>
                      <div className="bg-primary/20 border border-primary/30 p-3 rounded-2xl rounded-br-none text-xs text-on-surface self-end max-w-[85%]">Tell me about your pricing plans.</div>
                    </div>
                    <div className="p-4 bg-surface-container border-t border-outline/10 flex gap-3">
                      <div className="flex-grow bg-background rounded-lg px-4 py-2 text-xs text-on-surface-variant border border-outline/5 italic">Type a message...</div>
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                        <span className="material-symbols-outlined text-sm">send</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className={`step-transition ${currentStep !== 3 ? "hidden opacity-0 translate-y-8" : ""}`} id="step-3">
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
                    <button className="flex items-center gap-2 text-primary font-bold text-xs hover:text-white transition-colors" onClick={copyCode}>
                      <span className="material-symbols-outlined text-sm">content_copy</span> Copy Snippet
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
                    className="w-full h-full flex flex-col items-center justify-center p-6 bg-surface-container-low border border-outline/10 rounded-2xl hover:border-primary transition-all group"
                    id="verify-btn"
                    onClick={simulateVerify}
                    disabled={verifyState !== "idle"}
                  >
                    {verifyState === "idle" && (
                      <>
                        <span className="material-symbols-outlined text-2xl mb-2 group-hover:rotate-180 transition-transform duration-500">sync</span>
                        <span className="font-bold">Verify Live Status</span>
                      </>
                    )}
                    {verifyState === "verifying" && (
                      <>
                        <span className="material-symbols-outlined animate-spin text-2xl mb-2">sync</span>
                        <span className="font-bold">Verifying Connection...</span>
                      </>
                    )}
                    {verifyState === "verified" && (
                      <>
                        <span className="material-symbols-outlined text-green-500 text-2xl mb-2">verified</span>
                        <span className="font-bold text-green-500">Live &amp; Connected</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
          <div className="px-8 py-6 bg-surface-container-highest/20 border-t border-outline/10 flex justify-between items-center">
            <button
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
                className={`${currentStep === totalSteps ? "bg-green-500 text-white" : "bg-primary text-on-primary"} hover:bg-primary/90 px-10 py-3 rounded-xl font-bold transition-all ai-glow flex items-center gap-2 group`}
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
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors" href="/chat-widget">Chat Widget</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

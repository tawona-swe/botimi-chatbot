"use client";

import { useState, useRef } from "react";

export default function OnboardingStep3() {
  const [copied, setCopied] = useState(false);
  const glowRef = useRef(null);

  const copySnippet = () => {
    const code = document.getElementById("snippet-content").innerText;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleMouseMove = (e) => {
    const el = glowRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
        el.style.boxShadow = "0 0 25px rgba(192, 193, 255, 0.2)";
      } else {
        el.style.boxShadow = "0 0 15px rgba(192, 193, 255, 0.1)";
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <style>{`
        .code-glow {
            box-shadow: 0 0 15px rgba(192, 193, 255, 0.1);
        }
        .step-complete {
            background: var(--color-primary);
            color: var(--color-on-primary);
        }
        .step-active {
            border: 2px solid #c0c1ff;
            color: #c0c1ff;
        }
        .gradient-border {
            position: relative;
            background: var(--color-surface-container);
            border-radius: 1.5rem;
        }
        .gradient-border::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: 1.5rem;
            padding: 1px;
            background: linear-gradient(45deg, #c0c1ff, #4cd7f6);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
        }
      `}</style>
      <header className="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-16 border-b border-outline-variant sticky top-0 z-40">
        <a href="/" className="font-display text-headline-md font-extrabold text-primary dark:text-primary">botimi</a>
        <div className="flex items-center gap-4">
          <span className="font-label-md text-label-md text-on-surface-variant">Step 3 of 3</span>
          <button onClick={() => window.location.href = "/dashboard"} className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">close</button>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center pb-12 px-margin-mobile">
        <div className="w-full max-w-4xl space-y-stack-xl">
          <nav aria-label="Progress" className="flex items-center justify-center w-full max-w-2xl mx-auto">
            <ol className="flex items-center w-full" role="list">
              <li className="relative pr-8 sm:pr-20 group">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full step-complete">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-label-md text-label-md text-primary whitespace-nowrap">Knowledge Core</span>
              </li>
              <li className="relative pr-8 sm:pr-20 group">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full step-complete">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-label-md text-label-md text-primary whitespace-nowrap">Bot Persona</span>
              </li>
              <li className="relative">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container step-active">
                  <span className="font-label-md text-label-md font-bold">3</span>
                </div>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-label-md text-label-md text-on-surface whitespace-nowrap font-bold">Deployment</span>
              </li>
            </ol>
          </nav>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter pt-stack-lg">
            <div className="md:col-span-7 space-y-stack-md">
              <div className="space-y-stack-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Embed your Bot</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Paste the following snippet into your website's HTML to activate the botimi AI concierge. We recommend placing it just before the closing <code className="bg-surface-container px-1 rounded text-primary">&lt;/body&gt;</code> tag for optimal performance.</p>
              </div>
              <div ref={glowRef} onMouseMove={handleMouseMove} className="relative bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden code-glow group">
                <div className="flex items-center justify-between px-stack-md py-stack-sm bg-surface-container-high border-b border-outline-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-error/40" />
                    <span className="w-3 h-3 rounded-full bg-tertiary/40" />
                    <span className="w-3 h-3 rounded-full bg-secondary/40" />
                    <span className="font-label-md text-label-md text-on-surface-variant ml-2">bot-init.js</span>
                  </div>
                  <button
                    onClick={copySnippet}
                    className={`flex items-center gap-1.5 font-label-md text-label-md transition-colors ${copied ? "text-secondary" : "text-primary hover:text-primary-container"}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{copied ? "check" : "content_copy"}</span>
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-stack-md font-code-sm text-code-sm text-on-surface-variant overflow-x-auto leading-relaxed">
                  <pre><code id="snippet-content">{`<script>
  window.botimiConfig = {
    appId: "BH-9921-X4",
    theme: "midnight",
    features: ["voice", "translation"],
    onLoad: () => console.log("botimi Initialized")
  };
</script>
<script src="https://cdn.botimi.ai/v2/widget.js" async></script>`}</code></pre>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-gutter">
              <div className="gradient-border p-stack-lg space-y-stack-md h-full flex flex-col justify-between">
                <div className="space-y-stack-sm">
                  <div className="flex items-center gap-2 text-error">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="font-label-md text-label-md font-bold uppercase tracking-wider">Snippet not detected</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">We haven't received any pings from your website yet. Check your code implementation and try again.</p>
                </div>
                <div className="space-y-stack-sm">
                  <button onClick={() => window.location.href = "/dashboard"} className="w-full bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all py-3 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    Verify Installation
                  </button>
                  <p className="text-center font-body-sm text-body-sm text-on-surface-variant opacity-60">
                    Once verified, your bot will go live immediately.
                  </p>
                </div>
              </div>
              <div className="bg-surface-container rounded-xl border border-outline-variant p-stack-md flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                </div>
                <div>
                  <div className="font-label-md text-label-md text-on-surface font-bold">Ready for Orbit</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">System checks 92% complete</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-stack-md pt-stack-xl border-t border-outline-variant">
              <button onClick={() => window.location.href = "/onboarding-customize"} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl px-3 py-2 transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Bot Persona
            </button>
            <div className="flex items-center gap-stack-md w-full sm:w-auto">
              <button onClick={() => window.location.href = "/dashboard"} className="flex-grow sm:flex-none border border-outline-variant bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-5 py-3">
                Skip for Now
              </button>
              <button onClick={() => window.location.href = "/dashboard"} className="flex-grow sm:flex-none px-6 py-3 bg-secondary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                Finish Setup
              </button>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-stack-xl bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto gap-stack-md">
          <a href="/" className="font-display text-headline-md text-primary">botimi</a>
          <div className="flex gap-stack-lg">
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/dashboard">Dashboard</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/support">Support</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/docs">Docs</a>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">&copy; 2024 botimi AI Ecosystem. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

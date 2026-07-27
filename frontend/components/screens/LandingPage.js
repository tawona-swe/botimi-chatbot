"use client";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("botimi-theme", next ? "dark" : "light");
    } catch (e) {}
  };
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".bento-grid > div").forEach((el) => {
      el.classList.add(
        "opacity-0",
        "translate-y-10",
        "transition-all",
        "duration-700",
        "ease-out"
      );
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        .ai-glow {
          box-shadow: 0px 4px 20px rgba(99, 102, 241, 0.15);
        }
        .gradient-border {
          position: relative;
          border-radius: 1.5rem;
          background: linear-gradient(to right, #c0c1ff, #4cd7f6);
          padding: 1px;
        }
        .gradient-border-content {
          background: var(--color-surface-container-lowest);
          border-radius: calc(1.5rem - 1px);
        }
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 10px;
        }
        .hero-animate {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-tilt-sway {
          animation: tiltSway 6s ease-in-out infinite;
        }
        @keyframes tiltSway {
          0%, 100% { transform: perspective(800px) rotateY(-2deg) rotateX(1deg) translateY(0px); }
          25% { transform: perspective(800px) rotateY(2deg) rotateX(-0.5deg) translateY(-4px); }
          50% { transform: perspective(800px) rotateY(-1deg) rotateX(1.5deg) translateY(-2px); }
          75% { transform: perspective(800px) rotateY(3deg) rotateX(-1deg) translateY(-5px); }
        }
        .group:hover .animate-tilt-sway {
          animation-duration: 2s;
        }
      `}</style>
      <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <nav className="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-8">
            <a href="/" target="_top" className="font-display text-headline-md font-extrabold text-primary">
              botimi
            </a>
            <div className="hidden md:flex gap-6">
              <a
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/dashboard"
                target="_top"
              >
                Dashboard
              </a>
              <a
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/support"
                target="_top"
              >
                Support
              </a>
              <a
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/chat-widget"
                target="_top"
              >
                Chat Widget
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all duration-200"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              <span className="material-symbols-outlined text-xl">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>
            <button
              className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 px-4 py-2"
              onClick={() => (window.location.href = "/login")}
            >
              Log In
            </button>
            <button
              className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-6 py-2"
              onClick={() => (window.location.href = "/login")}
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>
      <main>
        <section className="relative min-h-[85vh] px-margin-mobile md:px-margin-desktop pt-24 md:pt-32">
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px] delay-1000 animate-pulse"></div>
          </div>
          <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="flex flex-col gap-stack-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant w-fit">
                <span className="material-symbols-outlined text-primary text-sm">bolt</span>
                <span className="font-label-md text-label-md text-primary">
                  Powered by world-class AI models
                </span>
              </div>
              <h1 className="font-display text-display text-on-surface leading-tight tracking-tighter">
                Low-Cost AI Chatbots <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  For Every Business.
                </span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Deploy a smart, context-aware chatbot trained on your data in minutes. Powered by industry-leading
                models for speed, accuracy, and reliability.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <button
                  className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-8 py-4 text-lg"
                  onClick={() => (window.location.href = "/login")}
                >
                  Get Started Free
                </button>
                <button
                  className="border border-outline/10 bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-8 py-4 text-lg"
                  onClick={() => (window.location.href = "/login")}
                >
                  Book a Demo
                </button>
              </div>
              <div className="flex items-center gap-4 mt-8 opacity-60">
                <div className="flex -space-x-3">
                  <img
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                    alt="Portrait of a diverse professional woman in a tech environment, representing a satisfied software engineer user, high resolution, minimalist office background, purple and blue ambient lighting."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDztneSctQtFe2TV2T2mOUVqKS74aLiD1LZP3PhVWuxqlvjslvO7Ac-SD1cO1cU2aTRkUmMa9sfQsn8_KZvhVT5AzjNjZMVda-hgyOpDBjDEe1fWfeSG94HZIRy6eM0mdT791xnuOL2iE5qz7wzYNLoCth-JAAS1_NpvUFwu4nqTYxYKpwCPk0GqJnMvZ7oa9ZKgtFk9Vi72yPnheV4FJOix2JwEVIPsMSXhmfIEaxFNK-hGko72BKcwj-I1usecRrgrimqakUsoFI"
                  />
                  <img
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                    alt="Portrait of a young male startup founder with glasses, creative studio setting, professional headshot style, dramatic teal and violet lighting, sharp focus on facial features."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd0uo3P-dScNr499XKHUR3VoBArb8SK4SYfyAru1hYvymaxcYJOFrtgxeJSmQEMhN4ImjzjFZZLASd2Y0MsOh9d5Ji4x_wa4U2dtzX5aje75EsjdrZzqYQcbtbNAyjwMv6UHYs4N9Jaztiiu_LmRyUFgQwmbkucLx9X9hgqCtqS8z5pdakPi8GDnPt5DBfs_pwSmjefH32_cKX18FCZtJZhuD3YdGv6vIzAS_tBxae7Nyr7ZlwxYhCf7NLbCSW4JrGkHDuW_cSge4"
                  />
                  <img
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                    alt="Close up portrait of an Asian male executive, sleek modern corporate aesthetic, soft blurred tech office background, warm but professional color grade with navy accents."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_ROlrvTkYTj1TkaJo7m19t1bQPlddhNIepWbfjxrZXddxiFaaxTZkEqP7KOtAX8bz3uzOrxxPuMkyPEuHd7E4kEYqhkKo-ztt1I6jKX9uj8eXfuBlVRRUqZUGt9fWDt4z9_ZWLdCo5cnD3XUMlrkfNABmonDAnFrGhQXQH7y83DVd5cFs114n5XIRFYM3mAOhYf4IxHd4U7cBI5QfVSuxa9TEyc2_0g_JCyjX2rT3vvIqiFGcr_N0EJXF84Fczllhbrl2AiiDEFk"
                  />
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Trusted by 500+ fast-growing teams
                </p>
              </div>
            </div>
            <div className="relative hero-animate hidden lg:block">
              <div className="gradient-border ai-glow">
                <div className="gradient-border-content p-6 flex flex-col h-[500px]">
                  <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined">smart_toy</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-bold">botimi AI</p>
                        <span className="flex items-center gap-1 text-[10px] text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                          Online & Processing
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">
                      more_horiz
                    </span>
                  </div>
                  <div className="flex-grow flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-surface-variant/50 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                      <p className="font-body-sm text-body-sm text-on-surface">
                        Hello! I've analyzed your product documentation. How can I assist your customers today?
                      </p>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-lg rounded-tr-none self-end max-w-[80%] border border-primary/30">
                      <p className="font-body-sm text-body-sm text-on-surface">
                        How do I set up the AI integration for instant replies?
                      </p>
                    </div>
                    <div className="bg-surface-variant/50 p-3 rounded-lg rounded-tl-none max-w-[85%] relative overflow-hidden pl-5">
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary via-secondary to-primary/40"></div>
                      <p className="font-body-sm text-body-sm text-on-surface mb-2">
                        Integrating AI models is simple. Follow these steps:
                      </p>
                      <ul className="text-[12px] list-disc list-inside text-on-surface-variant space-y-1">
                        <li>
                          Go to{" "}
                          <code className="bg-surface-container px-1 rounded">
                            Settings &gt; LLM Providers
                          </code>
                        </li>
                        <li>
                          Input your API key or use our <strong>Managed Tier</strong>
                        </li>
                        <li>
                          Toggle &quot;High Speed Mode&quot; for &lt;500ms latency
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant flex items-center gap-2">
                    <div className="flex-grow bg-surface-container rounded-lg px-4 py-2 text-on-surface-variant text-sm border border-outline-variant flex items-center justify-between">
                      <span>Type your message...</span>
                      <span className="material-symbols-outlined text-primary">send</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-12 bg-surface-container border border-outline-variant p-4 rounded-xl shadow-xl flex items-center gap-4 animate-bounce hover:animate-none">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Response Time</p>
                  <p className="font-headline-md text-headline-md font-bold text-on-surface">240ms</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-headline-lg text-on-surface mb-4">
              Powerful Features, Zero Complexity
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Everything you need to automate your customer support and sales funnel with world-class AI agents.
            </p>
          </div>
          <div className="bento-grid">
            <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-8 rounded-xl group hover:border-primary/50 transition-colors">
              <div className="flex flex-col md:flex-row gap-8 items-center h-full">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-3">AI-Powered RAG</h3>
                  <p className="text-on-surface-variant mb-6">
                    Our advanced Retrieval-Augmented Generation (RAG) system processes your PDFs, URLs, and docs to
                    ensure your bot never hallucinates and always provides accurate, brand-safe answers.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-on-surface-variant font-label-md">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span> Vectorized
                      Context Search
                    </li>
                    <li className="flex items-center gap-2 text-on-surface-variant font-label-md">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span> Real-time Data
                      Syncing
                    </li>
                  </ul>
                </div>
                <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg p-4 w-full h-full min-h-[200px] overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 bg-primary/10 rounded w-3/4"></div>
                    <div className="h-4 bg-outline-variant/20 rounded w-full"></div>
                    <div className="h-4 bg-outline-variant/20 rounded w-5/6"></div>
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex gap-2 items-center mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-[10px] font-code-sm text-primary">
                          VECTOR_MATCH_FOUND [98.2%]
                        </span>
                      </div>
                      <div className="h-2 bg-primary/20 rounded w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container border border-outline-variant p-8 rounded-xl group hover:border-secondary/50 transition-colors">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center text-secondary mb-6">
                <span className="material-symbols-outlined text-3xl">install_desktop</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">1-Click Install</h3>
              <p className="text-on-surface-variant">
                Copy-paste a single line of script and your bot is live. Supports React, Vue, WordPress, Shopify, and
                more.
              </p>
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container border border-outline-variant p-8 rounded-xl group hover:border-tertiary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-3xl">payments</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Zero API Costs</h3>
              <p className="text-on-surface-variant">
                Using our shared inference pool, small businesses pay $0 in additional token fees. Pure
                efficiency.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant p-8 rounded-xl group hover:border-primary/50 transition-colors">
              <div className="flex flex-col md:flex-row gap-8 items-center h-full">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-3xl">confirmation_number</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Ticket Support Add-on</h3>
                  <p className="text-on-surface-variant">
                    When the AI hits its limit, it seamlessly transitions to a human agent or creates a support ticket in
                    your existing CRM.
                  </p>
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div className="p-3 bg-surface-container-high rounded border border-outline-variant flex items-center justify-between">
                    <span className="font-label-md text-on-surface">Ticket #402: Technical Error</span>
                    <span className="px-2 py-0.5 bg-tertiary/20 text-tertiary rounded text-[10px]">OPEN</span>
                  </div>
                  <div className="p-3 bg-surface-container-high rounded border border-outline-variant flex items-center justify-between opacity-50">
                    <span className="font-label-md text-on-surface">Ticket #399: Billing Query</span>
                    <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[10px]">RESOLVED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-stack-xl bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div
                className="rounded-2xl border border-outline-variant shadow-2xl relative overflow-hidden group animate-tilt-sway"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none"></div>
                <div className="relative scale-110">
                  <img
                    src="/taxcul.png"
                    alt="Taxcul project dashboard showing AI-powered tax calculation"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ minHeight: "300px" }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <span className="material-symbols-outlined text-primary text-5xl opacity-100">format_quote</span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface italic leading-tight">
                  &quot;botimi transformed our support desk. We reduced human intervention by 70% in the first month
                  without losing customer satisfaction.&quot;
                </h3>
                <p className="text-on-surface-variant font-body-lg">
                  We were skeptical about AI hallucinations, but botimi&apos;s RAG system is bulletproof. It&apos;s
                  like having our best support rep working 24/7 for a fraction of the cost.
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src="/culverwell.png"
                    alt="Culverwell Venge"
                    className="w-12 h-12 rounded-full object-cover border-2 border-surface"
                  />
                  <div>
                    <p className="text-on-surface font-bold text-sm">Culverwell Venge</p>
                    <p className="text-primary text-xs">CEO, Taxcul</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-headline-lg text-on-surface mb-4">
              Scalable Plans for Scaling Teams
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Choose the tier that fits your volume. All plans include 1-click install and context-aware responses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface-container border border-outline-variant p-8 rounded-xl flex flex-col hover:border-primary/30 transition-all duration-300">
              <p className="font-label-md text-label-md text-primary mb-2">Starter</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-headline-lg font-display text-on-surface font-bold">$29</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-on-surface-variant text-sm mb-8">
                Perfect for early-stage startups and personal projects.
              </p>
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Up to 500 chats / month
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Multi-Model AI Integration
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Standard Support
                </li>
              </ul>
              <button
                className="w-full border border-outline/10 bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all py-3"
                onClick={() => (window.location.href = "/onboarding")}
              >
                Start Free Trial
              </button>
            </div>
            <div className="bg-surface-container border-2 border-primary p-8 rounded-xl flex flex-col shadow-xl shadow-primary/10 relative transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                Most Popular
              </div>
              <p className="font-label-md text-label-md text-primary mb-2">Growth</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-headline-lg font-display text-on-surface font-bold">$79</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-on-surface-variant text-sm mb-8">
                Ideal for growing businesses needing higher volume and speed.
              </p>
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Up to 5,000 chats / month
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> High-Speed AI Inference
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Advanced RAG (10 sources)
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Priority Email Support
                </li>
              </ul>
              <button
                className="w-full bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all py-3"
                onClick={() => (window.location.href = "/onboarding")}
              >
                Get Growth
              </button>
            </div>
            <div className="bg-surface-container border border-outline-variant p-8 rounded-xl flex flex-col hover:border-primary/30 transition-all duration-300">
              <p className="font-label-md text-label-md text-primary mb-2">Scale</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-headline-lg font-display text-on-surface font-bold">$199</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-on-surface-variant text-sm mb-8">
                Unlimited potential for enterprise-level operations.
              </p>
              <ul className="flex-grow space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Unlimited chats
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Custom LLM Fine-tuning
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Full API Access & Webhooks
                </li>
                <li className="flex items-center gap-3 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary">done</span> Dedicated Account Manager
                </li>
              </ul>
              <button
                className="w-full border border-outline/10 bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all py-3"
                onClick={() => (window.location.href = "/onboarding")}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </section>
        <section className="py-stack-xl px-margin-mobile">
          <div className="max-w-container-max mx-auto bg-gradient-to-br from-primary-container/20 to-secondary-container/20 border border-primary/20 rounded-3xl p-12 text-center overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full"></div>
            <h2 className="font-display text-display text-on-surface mb-6 relative z-10">Ready to automate?</h2>
            <p className="text-on-surface-variant text-body-lg max-w-xl mx-auto mb-10 relative z-10">
              Join 500+ businesses saving thousands on support costs with botimi. Deployment takes less than 5 minutes.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/onboarding")}
              >
                Start Free Deployment
              </button>
              <button
                className="border border-outline/10 bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Talk to an Expert
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-surface-container-lowest border-t border-outline-variant py-stack-xl">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto gap-8">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <a href="/" target="_top" className="font-display text-headline-md text-primary font-bold">
              botimi
            </a>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
              &copy; 2024 botimi AI Ecosystem. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/dashboard"
              target="_top"
            >
              Dashboard
            </a>
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/support"
              target="_top"
            >
              Support
            </a>
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/onboarding"
              target="_top"
            >
              Get Started
            </a>
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/chat-widget"
              target="_top"
            >
              Chat Widget
            </a>
          </div>
          <div className="flex gap-4">
            <a
              className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
              </svg>
            </a>
            <a
              className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
              href="#"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

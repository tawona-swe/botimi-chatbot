"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

const includedToday = [
  {
    icon: "travel_explore",
    title: "Trained on your content",
    description: "Crawls your whole site or ingests uploaded documents to answer questions accurately.",
  },
  {
    icon: "forum",
    title: "Conversational support",
    description: "Handles the questions your knowledge base actually has good answers for, in your brand's voice.",
  },
  {
    icon: "confirmation_number",
    title: "Human handoff",
    description: "When it isn't confident, it says so and escalates to your team instead of guessing — no silent failures.",
  },
];

const customWork = [
  {
    icon: "dns",
    title: "Your ticketing / ITSM system",
    description: "Look up and update real tickets in Zendesk, Jira Service Management, ServiceNow, or an internal system — not just create a new one in ours.",
  },
  {
    icon: "storage",
    title: "Your CRM or account data",
    description: "Pull live account status, order history, or entitlements so the bot answers with your customer's actual data, not just documentation.",
  },
  {
    icon: "webhook",
    title: "Internal APIs and tools",
    description: "Give the bot narrow, audited actions it can take in your systems — the same tool-calling approach we use for botimi's own dashboard assistant, wired to your infrastructure instead.",
  },
  {
    icon: "verified_user",
    title: "Auth and access control",
    description: "Scoped credentials and audit logging for whatever the bot is allowed to touch, reviewed with your security team before it goes live.",
  },
];

const steps = [
  { title: "Scoping call", description: "We map exactly which systems and actions matter for your support flow." },
  { title: "Bespoke build", description: "We build and test the integration against your actual systems, not a demo environment." },
  { title: "Review & launch", description: "Your team reviews access scope and behavior before it goes live to real customers." },
];

export default function EnterprisePage() {
  const { vendor } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
      `}</style>
      <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-8">
            <Link href="/" target="_top" className="font-display text-headline-md font-extrabold text-primary">
              botimi
            </Link>
            <div className="hidden md:flex gap-6">
              <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="/" target="_top">Home</Link>
              <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="/how-it-works" target="_top">How It Works</Link>
              <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="/pricing" target="_top">Pricing</Link>
              <Link className="font-body-md text-body-md text-primary font-semibold transition-colors duration-200" href="/enterprise" target="_top">Enterprise</Link>
              {vendor && (
                <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="/dashboard" target="_top">Dashboard</Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all duration-200"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="material-symbols-outlined text-xl">{isDark ? "light_mode" : "dark_mode"}</span>
            </button>
            <div className="hidden md:flex items-center gap-2">
              {!vendor && (
                <button className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 px-4 py-2" onClick={() => (window.location.href = "/login")}>Log In</button>
              )}
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-6 py-2"
                onClick={() => (window.location.href = "mailto:sales@botimi.ai?subject=Enterprise%20integration")}
              >
                Talk to Sales
              </button>
            </div>
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all duration-200"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className="material-symbols-outlined text-xl">{mobileMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant bg-background px-margin-mobile py-4 flex flex-col gap-1">
            <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container rounded-lg px-3 py-3 transition-colors duration-200" href="/" target="_top" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container rounded-lg px-3 py-3 transition-colors duration-200" href="/how-it-works" target="_top" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
            <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container rounded-lg px-3 py-3 transition-colors duration-200" href="/pricing" target="_top" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link className="font-body-md text-body-md text-primary font-semibold rounded-lg px-3 py-3 transition-colors duration-200" href="/enterprise" target="_top" onClick={() => setMobileMenuOpen(false)}>Enterprise</Link>
            {vendor && (
              <Link className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container rounded-lg px-3 py-3 transition-colors duration-200" href="/dashboard" target="_top" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            )}
            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-outline-variant">
              <button className="w-full bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-6 py-3" onClick={() => (window.location.href = "mailto:sales@botimi.ai?subject=Enterprise%20integration")}>Talk to Sales</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-16 px-margin-mobile md:px-margin-desktop">
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px] delay-1000 animate-pulse"></div>
          </div>
          <div className="max-w-container-max mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant w-fit mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-sm">hub</span>
              <span className="font-label-md text-label-md text-primary">Custom integrations, built with your team</span>
            </div>
            <h1 className="font-display text-display text-on-surface leading-tight tracking-tighter mb-6">
              When your knowledge base{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                isn&apos;t the whole answer
              </span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
              Every botimi bot answers from your docs out of the box. Some support questions need more than
              documentation — they need your ticketing system, your CRM, your internal tools. That&apos;s a scoped,
              custom integration we build with your team, not a toggle in settings.
            </p>
            <button
              className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
              onClick={() => (window.location.href = "mailto:sales@botimi.ai?subject=Enterprise%20integration")}
            >
              Talk to Sales
            </button>
          </div>
        </section>

        {/* ── What's included today ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-2">What every bot does today</h2>
          <p className="text-on-surface-variant text-center max-w-xl mx-auto mb-10">No custom work needed — this is included on every plan.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {includedToday.map((item) => (
              <div key={item.title} className="bg-surface-container border border-outline-variant rounded-xl p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{item.title}</h3>
                <p className="text-on-surface-variant">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Custom integration work ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-10">
            <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-2">What custom integration adds</h2>
            <p className="text-on-surface-variant text-center max-w-2xl mx-auto mb-10">
              Real actions in your actual systems — scoped, audited, and built for your stack specifically.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {customWork.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-1">{item.title}</h3>
                    <p className="text-on-surface-variant text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-10">How a custom integration gets built</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-display text-headline-md font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-2">{step.title}</h3>
                <p className="text-on-surface-variant text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-stack-xl px-margin-mobile">
          <div className="max-w-container-max mx-auto bg-gradient-to-br from-primary-container/20 to-secondary-container/20 border border-primary-container rounded-3xl p-12 text-center overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full"></div>
            <h2 className="font-display text-display text-on-surface mb-6 relative z-10">Have a system you need us to reach?</h2>
            <p className="text-on-surface-variant text-body-lg max-w-xl mx-auto mb-10 relative z-10">
              Tell us what your support team touches today — ticketing, CRM, internal tools — and we&apos;ll scope what
              a custom integration would look like.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "mailto:sales@botimi.ai?subject=Enterprise%20integration")}
              >
                Talk to Sales
              </button>
              <button
                className="border border-outline-variant bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/pricing")}
              >
                View Plans &amp; Pricing
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant py-stack-xl">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-8">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <Link href="/" target="_top" className="font-display text-headline-md text-primary font-bold">botimi</Link>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">&copy; 2024 botimi AI Ecosystem. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/pricing" target="_top">Pricing</Link>
            <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/how-it-works" target="_top">How It Works</Link>
            <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/enterprise" target="_top">Enterprise</Link>
            <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/dashboard" target="_top">Dashboard</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const steps = [
  {
    icon: "credit_card",
    title: "Choose Your Plan",
    description:
      "Pick the tier that fits your needs — Starter, Growth, or Scale. All plans include a 14-day free trial with no credit card required.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: "person_add",
    title: "Create Your Account",
    description:
      "Sign up in seconds with your email or Google account. No complicated setup — just your name, email, and a password.",
    color: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
  {
    icon: "smart_toy",
    title: "Train Your AI Bot",
    description:
      "Paste your website URL or upload documents. Our AI automatically crawls and indexes your content so your bot is ready to answer questions accurately.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: "code",
    title: "Deploy with One Line of Code",
    description:
      "Copy a single JavaScript snippet and paste it into your website. Your bot goes live instantly on any platform — WordPress, Shopify, React, and more.",
    color: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
];

const benefits = [
  { icon: "bolt", label: "Setup in under 5 minutes" },
  { icon: "psychology", label: "AI-powered, no manual training" },
  { icon: "devices", label: "Works on any website or CMS" },
  { icon: "trending_up", label: "Boost conversions 24/7" },
];

export default function HowItWorks() {
  const { vendor } = useAuth();
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".step-card").forEach((el) => observer.observe(el));
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
      `}</style>
      <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-8">
            <a href="/" target="_top" className="font-display text-headline-md font-extrabold text-primary">
              botimi
            </a>
            <div className="hidden md:flex gap-6">
              <a
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/"
                target="_top"
              >
                Home
              </a>
              <a
                className="font-body-md text-body-md text-primary font-semibold transition-colors duration-200"
                href="/how-it-works"
                target="_top"
              >
                How It Works
              </a>
              <a
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/pricing"
                target="_top"
              >
                Pricing
              </a>
              {vendor && (
                <a
                  className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                  href="/dashboard"
                  target="_top"
                >
                  Dashboard
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all duration-200"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="material-symbols-outlined text-xl">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>
            {!vendor && (
              <button
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 px-4 py-2"
                onClick={() => (window.location.href = "/login")}
              >
                Log In
              </button>
            )}
            {!vendor && (
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-6 py-2"
                onClick={() => (window.location.href = "/register")}
              >
                Get Started
              </button>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative pt-32 pb-16 px-margin-mobile md:px-margin-desktop">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px] delay-1000 animate-pulse"></div>
          </div>
          <div className="max-w-container-max mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant w-fit mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-sm">rocket_launch</span>
              <span className="font-label-md text-label-md text-primary">Go live in under 5 minutes</span>
            </div>
            <h1 className="font-display text-display text-on-surface leading-tight tracking-tighter mb-6">
              Get Started in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Four Simple Steps
              </span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
              No coding required. No AI expertise needed. Just pick a plan, create your account, and let botimi do
              the heavy lifting.
            </p>
            <button
              className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
              onClick={() => (window.location.href = "/pricing")}
            >
              View Plans &amp; Pricing
            </button>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="step-card opacity-0 translate-y-10 transition-all duration-700 ease-out bg-surface-container border border-outline-variant rounded-xl p-8 flex flex-col"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center ${step.iconColor}`}
                  >
                    <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface-variant font-bold">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{step.title}</h3>
                <p className="text-on-surface-variant flex-grow">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Stats ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {benefits.map((b) => (
                <div key={b.label} className="text-center">
                  <span className={`material-symbols-outlined text-4xl text-primary mb-3`}>{b.icon}</span>
                  <p className="font-body-md text-body-md text-on-surface font-medium">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-stack-xl px-margin-mobile">
          <div className="max-w-container-max mx-auto bg-gradient-to-br from-primary-container/20 to-secondary-container/20 border border-primary-container rounded-3xl p-12 text-center overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full"></div>
            <h2 className="font-display text-display text-on-surface mb-6 relative z-10">
              Ready to get started?
            </h2>
            <p className="text-on-surface-variant text-body-lg max-w-xl mx-auto mb-10 relative z-10">
              Join 500+ businesses already using botimi. Pick a plan and deploy your AI chatbot today.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/pricing")}
              >
                View Plans &amp; Pricing
              </button>
              <button
                className="border border-outline-variant bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/register")}
              >
                Create Free Account
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
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/pricing" target="_top">Pricing</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/how-it-works" target="_top">How It Works</a>
            <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/dashboard" target="_top">Dashboard</a>
          </div>
          <div className="flex gap-4">
            <a className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all" href="#">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path></svg>
            </a>
            <a className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-all" href="#">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function PricingPage() {
  const { vendor } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

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

    document.querySelectorAll(".pricing-card").forEach((el) => {
      el.classList.add(
        "opacity-0",
        "translate-y-10",
        "transition-all",
        "duration-700",
        "ease-out"
      );
      observer.observe(el);
    });

    document.querySelectorAll(".faq-item").forEach((el) => {
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

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 29,
      annualPrice: 290,
      description: "Perfect for early-stage startups and personal projects.",
      features: [
        "Up to 500 chats / month",
        "1 bot",
        "Multi-Model AI Integration",
        "Basic RAG (1 source)",
        "Standard Widget Customization",
        "Standard Support",
      ],
      cta: "Start Trial",
      highlighted: false,
    },
    {
      name: "Growth",
      monthlyPrice: 79,
      annualPrice: 790,
      description: "Ideal for growing businesses needing higher volume and speed.",
      features: [
        "Up to 5,000 chats / month",
        "5 bots",
        "High-Speed AI Inference",
        "Advanced RAG (10 sources)",
        "Priority Widget Customization",
        "Priority Email Support",
        "Detailed Analytics",
        "Ticket Add-on Included",
      ],
      cta: "Get Growth",
      highlighted: true,
    },
    {
      name: "Scale",
      monthlyPrice: 199,
      annualPrice: 1990,
      description: "Unlimited potential for enterprise-level operations.",
      features: [
        "Unlimited chats",
        "Unlimited bots",
        "Custom LLM Fine-tuning",
        "Advanced RAG (unlimited sources)",
        "Full API Access & Webhooks",
        "Dedicated Account Manager",
        "Custom Integrations",
        "SLA Guarantee (99.9% uptime)",
        "White-label Widget",
        "SSO / SAML",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: "Can I switch plans at any time?",
      a: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing automatically.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes! Every plan comes with a 14-day free trial — no credit card required. You get full access to all features in your chosen tier during the trial period.",
    },
    {
      q: "What counts as a chat?",
      a: "A chat is a single conversation session between one visitor and your bot. Each session counts as one chat regardless of how many messages are exchanged within it.",
    },
    {
      q: "Can I get a custom enterprise plan?",
      a: "Yes, we offer tailored enterprise plans with custom pricing, dedicated infrastructure, advanced compliance (SOC 2, HIPAA), and personalized onboarding. Contact our sales team for a quote.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual enterprise plans. All payments are processed securely via Stripe.",
    },
    {
      q: "Is there a discount for annual billing?",
      a: "Yes! When you choose annual billing, you save roughly 17% compared to the monthly rate. The discount is already reflected in the annual prices shown above.",
    },
  ];

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          vertical-align: middle;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 10px;
        }
        .pricing-card:nth-child(2) {
          transition-delay: 150ms;
        }
        .pricing-card:nth-child(3) {
          transition-delay: 300ms;
        }
      `}</style>

      {/* ── Navigation ── */}
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
                className="font-body-md text-body-md text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
                href="/how-it-works"
                target="_top"
              >
                How It Works
              </a>
              <a
                className="font-body-md text-body-md text-primary font-semibold transition-colors duration-200"
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
              title={isDark ? "Light mode" : "Dark mode"}
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
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px] delay-1000 animate-pulse"></div>
          </div>
          <div className="max-w-container-max mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant w-fit mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-sm">sell</span>
              <span className="font-label-md text-label-md text-primary">Simple, transparent pricing</span>
            </div>
            <h1 className="font-display text-display text-on-surface leading-tight tracking-tighter mb-6">
              The Right Plan{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                For Your Growth
              </span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
              Start with a 14-day free trial — no credit card required. Upgrade, downgrade, or cancel anytime.
            </p>

            {/* ── Billing Toggle ── */}
            <div className="flex items-center justify-center gap-4">
              <span className={`font-body-md text-body-md ${!isAnnual ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  isAnnual ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                    isAnnual ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`font-body-md text-body-md ${isAnnual ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                Annual
                <span className="ml-1.5 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Save ~17%
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* ── Pricing Cards ── */}
        <section className="pb-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card rounded-xl flex flex-col ${
                  plan.highlighted
                    ? "bg-surface-container border-2 border-primary shadow-xl shadow-primary/10 relative transform md:-translate-y-4"
                    : "bg-surface-container border border-outline-variant hover:border-primary/30 transition-all duration-300"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="p-8 pb-0">
                  <p className="font-label-md text-label-md text-primary mb-2">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-headline-lg font-display text-on-surface font-bold">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-on-surface-variant">/{isAnnual ? "year" : "month"}</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-on-surface-variant mb-4">
                      ${plan.monthlyPrice}/mo if paid monthly
                    </p>
                  )}
                  <p className="text-on-surface-variant text-sm mb-8">{plan.description}</p>
                </div>
                <div className="px-8 flex-grow">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-on-surface">
                        <span className="material-symbols-outlined text-primary text-lg shrink-0">done</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-8 pb-8">
                  <button
                    className={`w-full rounded-xl text-sm font-bold transition-all py-3 ${
                      plan.highlighted
                        ? "bg-primary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]"
                        : "border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high active:scale-[0.98]"
                    }`}
                    onClick={() => (window.location.href = "/register")}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Comparison ── */}
        <section className="py-stack-xl px-margin-mobile md:px-margin-desktop bg-surface-container-lowest">
          <div className="max-w-container-max mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-headline-lg text-on-surface mb-4">
                Compare Plans Side by Side
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Every feature you need to make the right choice for your business.
              </p>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-4 pr-8 font-body-md text-body-md text-on-surface font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 font-body-md text-body-md text-on-surface font-semibold">Starter</th>
                    <th className="text-center py-4 px-4 font-body-md text-body-md text-primary font-semibold">Growth</th>
                    <th className="text-center py-4 pl-4 font-body-md text-body-md text-on-surface font-semibold">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Monthly chats", starter: "500", growth: "5,000", scale: "Unlimited" },
                    { label: "Bots", starter: "1", growth: "5", scale: "Unlimited" },
                    { label: "AI Models", starter: "Standard", growth: "High-Speed", scale: "Custom Fine-tuning" },
                    { label: "RAG Sources", starter: "1", growth: "10", scale: "Unlimited" },
                    { label: "Widget Customization", starter: "Basic", growth: "Priority", scale: "White-label" },
                    { label: "Analytics", starter: "Basic", growth: "Detailed", scale: "Advanced + Export" },
                    { label: "Ticket Add-on", starter: "—", growth: "✓", scale: "✓" },
                    { label: "API Access", starter: "—", growth: "—", scale: "Full Access" },
                    { label: "Webhooks", starter: "—", growth: "—", scale: "✓" },
                    { label: "SSO / SAML", starter: "—", growth: "—", scale: "✓" },
                    { label: "SLA Guarantee", starter: "—", growth: "—", scale: "99.9%" },
                    { label: "Support", starter: "Standard", growth: "Priority Email", scale: "Dedicated Manager" },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-outline-variant hover:bg-surface-container/50 transition-colors">
                      <td className="py-4 pr-8 text-sm text-on-surface font-medium">{row.label}</td>
                      <td className="text-center py-4 px-4 text-sm text-on-surface-variant">{row.starter}</td>
                      <td className="text-center py-4 px-4 text-sm text-on-surface-variant">{row.growth}</td>
                      <td className="text-center py-4 pl-4 text-sm text-on-surface-variant">{row.scale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-stack-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-headline-lg text-on-surface mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Everything you need to know about our pricing and plans.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="faq-item bg-surface-container border border-outline-variant rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-body-md text-body-md text-on-surface font-medium pr-4">
                    {faq.q}
                  </span>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 shrink-0 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}>
                    expand_more
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-stack-xl px-margin-mobile">
          <div className="max-w-container-max mx-auto bg-gradient-to-br from-primary-container/20 to-secondary-container/20 border border-primary-container rounded-3xl p-12 text-center overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full"></div>
            <h2 className="font-display text-display text-on-surface mb-6 relative z-10">
              Start your 14-day free trial
            </h2>
            <p className="text-on-surface-variant text-body-lg max-w-xl mx-auto mb-10 relative z-10">
              No credit card required. Full access to all features. Deploy in under 5 minutes.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
              <button
                className="bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/register")}
              >
                Get Started Free
              </button>
              <button
                className="border border-outline-variant bg-surface-container text-on-surface rounded-xl text-sm font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all px-10 py-4 text-lg"
                onClick={() => (window.location.href = "/login")}
              >
                Talk to Sales
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
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
              href="/how-it-works"
              target="_top"
            >
              How It Works
            </a>
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/pricing"
              target="_top"
            >
              Pricing
            </a>
            <a
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors"
              href="/dashboard"
              target="_top"
            >
              Dashboard
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

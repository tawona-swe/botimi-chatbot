import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "../context/AuthContext";
import { AssistantProvider } from "../context/AssistantContext";
import DashboardAssistant from "../components/ui/DashboardAssistant";
import GuestAssistant from "../components/ui/GuestAssistant";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "botimi — AI Chatbots for Your Business",
  description: "Deploy smart, context-aware AI chatbots for your business, trained on your data in minutes."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* cdn.tailwindcss.com JIT-compiles this app's whole utility CSS in the
            browser on every full page load, which takes a few real seconds —
            long enough that painting the page immediately shows unstyled HTML
            until it finishes. This hides the app behind a plain-CSS loading
            mark (no Tailwind dependency, so it always renders instantly) until
            the "tw-ready" class lands right after tailwind.config is applied,
            with a fallback reveal in case the CDN script fails outright. */}
        <style>{`
          html:not(.tw-ready) body { visibility: hidden; }
          #tw-loader {
            visibility: visible !important;
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
            background: #f8f9fc;
            font-family: "DM Sans", sans-serif;
          }
          html.dark #tw-loader { background: #13131b; }
          html.tw-ready #tw-loader { display: none; }

          #tw-loader-word {
            font-weight: 700; font-size: 22px; letter-spacing: -0.02em;
            background: linear-gradient(90deg, #4A1A8A 30%, #C4A0FF 50%, #4A1A8A 70%);
            background-size: 220% 100%;
            -webkit-background-clip: text; background-clip: text;
            -webkit-text-fill-color: transparent; color: transparent;
            animation: tw-loader-shimmer 2.2s linear infinite;
          }
          html.dark #tw-loader-word { background: linear-gradient(90deg, #C4A0FF 30%, #EDE4FF 50%, #C4A0FF 70%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }

          #tw-loader-dots { display: flex; gap: 6px; }
          #tw-loader-dots span {
            width: 6px; height: 6px; border-radius: 50%;
            background: #4A1A8A;
            animation: tw-loader-bounce 1.1s ease-in-out infinite;
          }
          html.dark #tw-loader-dots span { background: #C4A0FF; }
          #tw-loader-dots span:nth-child(2) { animation-delay: 0.15s; }
          #tw-loader-dots span:nth-child(3) { animation-delay: 0.3s; }

          @keyframes tw-loader-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @keyframes tw-loader-bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
            30% { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
        <Script
          id="tw-fouc-fallback"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.__twReady = function() {
                document.documentElement.classList.add('tw-ready');
              };
              setTimeout(window.__twReady, 6000);
            `
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@400;500;600;700&family=Instrument+Serif:ital@1&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var s = localStorage.getItem('botimi-theme');
                  if (s === 'dark') document.documentElement.classList.add('dark');
                } catch(e) {}
              })();
            `
          }}
        />
        <Script
          id="tailwind-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // The CDN script is loaded here (rather than as a separate
              // <Script> tag) and the config is only assigned inside its
              // onload — Next.js's beforeInteractive scripts don't guarantee
              // that a separate later script tag runs after this one
              // finishes loading, so setting tailwind.config from a sibling
              // tag can race Tailwind's first (unconfigured) DOM scan and
              // silently drop every opacity-modified utility (e.g. bg-x/50).
              var twScript = document.createElement("script");
              twScript.src = "https://cdn.tailwindcss.com?plugins=forms,container-queries";
              twScript.onload = function() {
              tailwind.config = {
                darkMode: "class",
                theme: {
                  extend: {
                    colors: {
                      "on-secondary-container": "rgb(var(--color-on-secondary-container-rgb) / <alpha-value>)",
                      "secondary-fixed": "rgb(var(--color-secondary-fixed-rgb) / <alpha-value>)",
                      "surface-variant": "rgb(var(--color-surface-variant-rgb) / <alpha-value>)",
                      "on-primary-fixed-variant": "rgb(var(--color-on-primary-fixed-variant-rgb) / <alpha-value>)",
                      "surface-container": "rgb(var(--color-surface-container-rgb) / <alpha-value>)",
                      "on-primary-fixed": "rgb(var(--color-on-primary-fixed-rgb) / <alpha-value>)",
                      "inverse-surface": "rgb(var(--color-inverse-surface-rgb) / <alpha-value>)",
                      "tertiary-container": "rgb(var(--color-tertiary-container-rgb) / <alpha-value>)",
                      "on-background": "rgb(var(--color-on-background-rgb) / <alpha-value>)",
                      "tertiary-fixed-dim": "rgb(var(--color-tertiary-fixed-dim-rgb) / <alpha-value>)",
                      "on-primary": "rgb(var(--color-on-primary-rgb) / <alpha-value>)",
                      "surface-tint": "rgb(var(--color-surface-tint-rgb) / <alpha-value>)",
                      "secondary": "rgb(var(--color-secondary-rgb) / <alpha-value>)",
                      "primary-fixed-dim": "rgb(var(--color-primary-fixed-dim-rgb) / <alpha-value>)",
                      "surface-dim": "rgb(var(--color-surface-dim-rgb) / <alpha-value>)",
                      "outline": "rgb(var(--color-outline-rgb) / <alpha-value>)",
                      "on-error-container": "rgb(var(--color-on-error-container-rgb) / <alpha-value>)",
                      "surface-container-lowest": "rgb(var(--color-surface-container-lowest-rgb) / <alpha-value>)",
                      "on-secondary-fixed": "rgb(var(--color-on-secondary-fixed-rgb) / <alpha-value>)",
                      "surface-bright": "rgb(var(--color-surface-bright-rgb) / <alpha-value>)",
                      "on-tertiary": "rgb(var(--color-on-tertiary-rgb) / <alpha-value>)",
                      "on-tertiary-container": "rgb(var(--color-on-tertiary-container-rgb) / <alpha-value>)",
                      "on-primary-container": "rgb(var(--color-on-primary-container-rgb) / <alpha-value>)",
                      "secondary-container": "rgb(var(--color-secondary-container-rgb) / <alpha-value>)",
                      "error": "rgb(var(--color-error-rgb) / <alpha-value>)",
                      "primary-container": "rgb(var(--color-primary-container-rgb) / <alpha-value>)",
                      "on-tertiary-fixed": "rgb(var(--color-on-tertiary-fixed-rgb) / <alpha-value>)",
                      "on-secondary": "rgb(var(--color-on-secondary-rgb) / <alpha-value>)",
                      "tertiary-fixed": "rgb(var(--color-tertiary-fixed-rgb) / <alpha-value>)",
                      "secondary-fixed-dim": "rgb(var(--color-secondary-fixed-dim-rgb) / <alpha-value>)",
                      "on-surface-variant": "rgb(var(--color-on-surface-variant-rgb) / <alpha-value>)",
                      "surface-container-high": "rgb(var(--color-surface-container-high-rgb) / <alpha-value>)",
                      "on-surface": "rgb(var(--color-on-surface-rgb) / <alpha-value>)",
                      "background": "rgb(var(--color-background-rgb) / <alpha-value>)",
                      "on-secondary-fixed-variant": "rgb(var(--color-on-secondary-fixed-variant-rgb) / <alpha-value>)",
                      "surface-container-highest": "rgb(var(--color-surface-container-highest-rgb) / <alpha-value>)",
                      "inverse-primary": "rgb(var(--color-inverse-primary-rgb) / <alpha-value>)",
                      "error-container": "rgb(var(--color-error-container-rgb) / <alpha-value>)",
                      "outline-variant": "rgb(var(--color-outline-variant-rgb) / <alpha-value>)",
                      "tertiary": "rgb(var(--color-tertiary-rgb) / <alpha-value>)",
                      "primary": "rgb(var(--color-primary-rgb) / <alpha-value>)",
                      "on-tertiary-fixed-variant": "rgb(var(--color-on-tertiary-fixed-variant-rgb) / <alpha-value>)",
                      "surface": "rgb(var(--color-surface-rgb) / <alpha-value>)",
                      "on-error": "rgb(var(--color-on-error-rgb) / <alpha-value>)",
                      "inverse-on-surface": "rgb(var(--color-inverse-on-surface-rgb) / <alpha-value>)",
                      "primary-fixed": "rgb(var(--color-primary-fixed-rgb) / <alpha-value>)",
                      "surface-container-low": "rgb(var(--color-surface-container-low-rgb) / <alpha-value>)",
                      "accent": "#6A2BC2"
                    },
                    borderRadius: {
                      DEFAULT: "0.5rem",
                      lg: "1rem",
                      xl: "0.625rem",
                      full: "9999px"
                    },
                    gridTemplateColumns: {
                      20: "repeat(20, minmax(0, 1fr))"
                    },
                    spacing: {
                      gutter: "24px",
                      "stack-sm": "8px",
                      "stack-xs": "4px",
                      "margin-mobile": "16px",
                      "stack-lg": "24px",
                      "container-max": "1440px",
                      "stack-xl": "48px",
                      "margin-desktop": "40px",
                      unit: "4px",
                      "stack-md": "16px"
                    },
                    fontFamily: {
                      "label-md": ["DM Sans", "sans-serif"],
                      "headline-lg-mobile": ["DM Sans", "sans-serif"],
                      "body-md": ["DM Sans", "sans-serif"],
                      "code-sm": ["JetBrains Mono", "monospace"],
                      "headline-lg": ["DM Sans", "sans-serif"],
                      "body-lg": ["DM Sans", "sans-serif"],
                      display: ["DM Sans", "sans-serif"],
                      "headline-md": ["DM Sans", "sans-serif"],
                      "body-sm": ["DM Sans", "sans-serif"],
                      script: ["Caveat", "cursive"]
                    },
                    fontSize: {
                      "label-md": ["12px", { lineHeight: "15px", letterSpacing: "0.02em", fontWeight: "500" }],
                      "headline-lg-mobile": ["21px", { lineHeight: "28px", fontWeight: "600" }],
                      "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
                      "code-sm": ["12px", { lineHeight: "17px", fontWeight: "400" }],
                      "headline-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
                      "body-lg": ["16px", { lineHeight: "25px", fontWeight: "400" }],
                      display: ["44px", { lineHeight: "52px", letterSpacing: "-0.02em", fontWeight: "800" }],
                      "headline-md": ["21px", { lineHeight: "28px", fontWeight: "600" }],
                      "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }]
                    }
                  }
                }
              };
              window.__twReady();
              };
              twScript.onerror = function() {
                window.__twReady();
              };
              document.head.appendChild(twScript);
            `
          }}
        />
      </head>
      <body>
        <div id="tw-loader">
          <div id="tw-loader-word">botimi</div>
          <div id="tw-loader-dots"><span></span><span></span><span></span></div>
        </div>
        <AuthProvider>
          <AssistantProvider>
            {children}
            <DashboardAssistant />
            <GuestAssistant />
          </AssistantProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
                border: "1px solid var(--color-outline-variant)",
                fontSize: "14px",
                borderRadius: "12px",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "white" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "white" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

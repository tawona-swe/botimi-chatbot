import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "botimi — AI Chatbots for Your Business",
  description: "Deploy smart, context-aware AI chatbots for your business, trained on your data in minutes."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@400;500;600;700&family=Instrument+Serif:ital@1&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <script
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
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: "class",
                theme: {
                  extend: {
                    colors: {
                      "on-secondary-container": "var(--color-on-secondary-container)",
                      "secondary-fixed": "var(--color-secondary-fixed)",
                      "surface-variant": "var(--color-surface-variant)",
                      "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)",
                      "surface-container": "var(--color-surface-container)",
                      "on-primary-fixed": "var(--color-on-primary-fixed)",
                      "inverse-surface": "var(--color-inverse-surface)",
                      "tertiary-container": "var(--color-tertiary-container)",
                      "on-background": "var(--color-on-background)",
                      "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",
                      "on-primary": "var(--color-on-primary)",
                      "surface-tint": "var(--color-surface-tint)",
                      "secondary": "var(--color-secondary)",
                      "primary-fixed-dim": "var(--color-primary-fixed-dim)",
                      "surface-dim": "var(--color-surface-dim)",
                      "outline": "var(--color-outline)",
                      "on-error-container": "var(--color-on-error-container)",
                      "surface-container-lowest": "var(--color-surface-container-lowest)",
                      "on-secondary-fixed": "var(--color-on-secondary-fixed)",
                      "surface-bright": "var(--color-surface-bright)",
                      "on-tertiary": "var(--color-on-tertiary)",
                      "on-tertiary-container": "var(--color-on-tertiary-container)",
                      "on-primary-container": "var(--color-on-primary-container)",
                      "secondary-container": "var(--color-secondary-container)",
                      "error": "var(--color-error)",
                      "primary-container": "var(--color-primary-container)",
                      "on-tertiary-fixed": "var(--color-on-tertiary-fixed)",
                      "on-secondary": "var(--color-on-secondary)",
                      "tertiary-fixed": "var(--color-tertiary-fixed)",
                      "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
                      "on-surface-variant": "var(--color-on-surface-variant)",
                      "surface-container-high": "var(--color-surface-container-high)",
                      "on-surface": "var(--color-on-surface)",
                      "background": "var(--color-background)",
                      "on-secondary-fixed-variant": "var(--color-on-secondary-fixed-variant)",
                      "surface-container-highest": "var(--color-surface-container-highest)",
                      "inverse-primary": "var(--color-inverse-primary)",
                      "error-container": "var(--color-error-container)",
                      "outline-variant": "var(--color-outline-variant)",
                      "tertiary": "var(--color-tertiary)",
                      "primary": "var(--color-primary)",
                      "on-tertiary-fixed-variant": "var(--color-on-tertiary-fixed-variant)",
                      "surface": "var(--color-surface)",
                      "on-error": "var(--color-on-error)",
                      "inverse-on-surface": "var(--color-inverse-on-surface)",
                      "primary-fixed": "var(--color-primary-fixed)",
                      "surface-container-low": "var(--color-surface-container-low)",
                      "accent": "#6A2BC2"
                    },
                    borderRadius: {
                      DEFAULT: "0.5rem",
                      lg: "1rem",
                      xl: "1.5rem",
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
            `
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
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

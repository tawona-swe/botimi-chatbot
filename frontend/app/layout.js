import "./globals.css";
import Script from "next/script";
import { DM_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { AssistantProvider } from "../context/AssistantContext";
import DashboardAssistant from "../components/ui/DashboardAssistant";
import GuestAssistant from "../components/ui/GuestAssistant";
import { Toaster } from "react-hot-toast";

const SITE_URL = "https://app.botimi.co.zw";
const DEFAULT_DESCRIPTION = "Deploy an AI chatbot trained on your website or documents in minutes — website widget and WhatsApp, with human handoff and a built-in support inbox when it can't answer.";

// Self-hosted via next/font instead of the old fonts.googleapis.com <link>
// tag -- removes a render-blocking external request and a third-party
// (Google Fonts CDN) connection entirely for these three. Only the fonts
// referenced from exactly one place (the Tailwind config below) are safe
// to move this way; "Outfit" is used via ~18 scattered inline style
// literals across the app (every wordmark instance) and isn't touched
// here -- migrating it blind, with no way to visually verify every one of
// those still renders correctly, isn't worth the risk. Still loaded from
// the classic <link> tag below, same as Material Symbols (an icon font,
// same reasoning). "Instrument Serif" was also on that link and is now
// removed outright -- confirmed unused anywhere in the codebase.
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains-mono", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "botimi | AI Chatbots for Business",
    template: "%s | botimi",
  },
  description: DEFAULT_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: "botimi",
    title: "botimi | AI Chatbots for Business",
    description: DEFAULT_DESCRIPTION,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "botimi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "botimi | AI Chatbots for Business",
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
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
      </head>
      <body>
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

import Link from "next/link";
import LandingPage from "../../components/screens/LandingPage";
import Dashboard from "../../components/screens/Dashboard";
import SupportInbox from "../../components/screens/SupportInbox";
import OnboardingWizard from "../../components/screens/OnboardingWizard";
import OnboardingRedesign from "../../components/screens/OnboardingRedesign";
import OnboardingStep2 from "../../components/screens/OnboardingStep2";
import OnboardingStep3 from "../../components/screens/OnboardingStep3";
import DocsPage from "../../components/screens/DocsPage";
import BotsPage from "../../components/screens/BotsPage";
import AnalyticsPage from "../../components/screens/AnalyticsPage";
import SettingsPage from "../../components/screens/SettingsPage";
import AdminPage from "../../components/screens/AdminPage";
import PricingPage from "../../components/screens/PricingPage";
import HowItWorks from "../../components/screens/HowItWorks";

const screenInfo = {
  landing: { title: "Landing Page", Component: LandingPage },
  "how-it-works": { title: "How It Works", Component: HowItWorks },
  pricing: { title: "Pricing", Component: PricingPage },
  dashboard: { title: "Vendor Dashboard", Component: Dashboard },
  support: { title: "Support Inbox", Component: SupportInbox },
  onboarding: { title: "Onboarding Wizard", Component: OnboardingWizard },
  "onboarding-redesign": { title: "Onboarding Redesign", Component: OnboardingRedesign },
  "onboarding-customize": { title: "Onboarding Step 2", Component: OnboardingStep2 },
  "onboarding-install": { title: "Onboarding Step 3", Component: OnboardingStep3 },
  "docs": { title: "Documentation & Playground", Component: DocsPage },
  bots: { title: "Bot Management", Component: BotsPage },
  analytics: { title: "Analytics", Component: AnalyticsPage },
  settings: { title: "Settings", Component: SettingsPage },
  admin: { title: "Admin Panel", Component: AdminPage },
};

export function generateStaticParams() {
  return Object.keys(screenInfo).map((screen) => ({ screen }));
}

export async function generateMetadata({ params }) {
  const { screen: slug } = await params;
  const info = screenInfo[slug];

  return {
    title: info ? `${info.title} | botimi` : "Screen not found | botimi"
  };
}

export default async function ScreenPage({ params }) {
  const { screen: slug } = await params;

  if (!screenInfo[slug]) {
    return (
      <main className="missing-page">
        <div className="missing-card">
          <h1>Screen not found</h1>
          <p>The requested botimi UI screen is not registered in this Next.js app.</p>
          <Link href="/">Back to all screens</Link>
        </div>
      </main>
    );
  }

  const { Component } = screenInfo[slug];
  return <Component />;
}
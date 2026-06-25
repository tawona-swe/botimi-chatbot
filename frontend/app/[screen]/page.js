import Link from "next/link";
import LandingPage from "../../components/screens/LandingPage";
import Dashboard from "../../components/screens/Dashboard";
import SupportInbox from "../../components/screens/SupportInbox";
import OnboardingWizard from "../../components/screens/OnboardingWizard";
import OnboardingRedesign from "../../components/screens/OnboardingRedesign";
import OnboardingStep2 from "../../components/screens/OnboardingStep2";
import OnboardingStep3 from "../../components/screens/OnboardingStep3";
import ChatWidget from "../../components/screens/ChatWidget";

const screenInfo = {
  landing: { title: "Landing Page", Component: LandingPage },
  dashboard: { title: "Vendor Dashboard", Component: Dashboard },
  support: { title: "Support Inbox", Component: SupportInbox },
  onboarding: { title: "Onboarding Wizard", Component: OnboardingWizard },
  "onboarding-redesign": { title: "Onboarding Redesign", Component: OnboardingRedesign },
  "onboarding-customize": { title: "Onboarding Step 2", Component: OnboardingStep2 },
  "onboarding-install": { title: "Onboarding Step 3", Component: OnboardingStep3 },
  "chat-widget": { title: "Expanded Chat Widget", Component: ChatWidget },
};

export function generateStaticParams() {
  return Object.keys(screenInfo).map((screen) => ({ screen }));
}

export async function generateMetadata({ params }) {
  const { screen: slug } = await params;
  const info = screenInfo[slug];

  return {
    title: info ? `${info.title} | Botimi` : "Screen not found | Botimi"
  };
}

export default async function ScreenPage({ params }) {
  const { screen: slug } = await params;

  if (!screenInfo[slug]) {
    return (
      <main className="missing-page">
        <div className="missing-card">
          <h1>Screen not found</h1>
          <p>The requested Botimi UI screen is not registered in this Next.js app.</p>
          <Link href="/">Back to all screens</Link>
        </div>
      </main>
    );
  }

  const { Component } = screenInfo[slug];
  return <Component />;
}
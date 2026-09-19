import { notFound } from "next/navigation";
import Dashboard from "../../components/screens/Dashboard";
import SupportInbox from "../../components/screens/SupportInbox";
import OnboardingWizard from "../../components/screens/OnboardingWizard";
import OnboardingPlan from "../../components/screens/OnboardingPlan";
import DocsPage from "../../components/screens/DocsPage";
import BotsPage from "../../components/screens/BotsPage";
import AnalyticsPage from "../../components/screens/AnalyticsPage";
import SettingsPage from "../../components/screens/SettingsPage";
import AdminPage from "../../components/screens/AdminPage";
import PricingPage from "../../components/screens/PricingPage";
import HowItWorks from "../../components/screens/HowItWorks";
import EnterprisePage from "../../components/screens/EnterprisePage";
import PrivacyPolicy from "../../components/screens/PrivacyPolicy";
import TermsOfService from "../../components/screens/TermsOfService";

// `landing` is intentionally absent -- it rendered the exact same content as
// the real homepage ("/"), which is a duplicate-content problem for SEO.
// next.config.mjs 301-redirects /landing to / instead of this registering
// a second indexable copy of it.
const screenInfo = {
  "how-it-works": {
    title: "How It Works",
    description: "See how botimi trains an AI chatbot on your website or documents in minutes, then deploys it to your site and WhatsApp with human handoff built in.",
    Component: HowItWorks,
    public: true,
  },
  pricing: {
    title: "Pricing",
    description: "Compare botimi's Starter, Growth, and Business plans — transparent monthly pricing with a 14-day free trial and no credit card required.",
    Component: PricingPage,
    public: true,
  },
  enterprise: {
    title: "Enterprise Integrations",
    description: "Custom AI chatbot integrations for enterprise support teams — connect your ticketing system, CRM, and internal tools to botimi with a dedicated build and review process.",
    Component: EnterprisePage,
    public: true,
  },
  privacy: {
    title: "Privacy Policy",
    description: "How botimi collects, uses, and protects your data as a vendor using our AI chatbot dashboard.",
    Component: PrivacyPolicy,
    public: true,
  },
  terms: {
    title: "Terms & Conditions",
    description: "The terms and conditions governing your use of the botimi AI chatbot platform.",
    Component: TermsOfService,
    public: true,
  },
  "docs": {
    title: "Documentation & Playground",
    description: "Step-by-step guides for training, embedding, and testing your botimi AI chatbot, plus platform-specific instructions for WordPress, Shopify, and custom sites.",
    Component: DocsPage,
    public: true,
  },
  dashboard: { title: "Vendor Dashboard", Component: Dashboard },
  support: { title: "Support Inbox", Component: SupportInbox },
  onboarding: { title: "Onboarding Wizard", Component: OnboardingWizard },
  "onboarding-plan": { title: "Choose Your Plan", Component: OnboardingPlan },
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

  // notFound() below is what actually produces a real 404 -- this is just
  // defensive, since Next supersedes it with the not-found boundary anyway.
  if (!info) return { robots: { index: false, follow: false } };

  // Private, behind-auth app screens (dashboard, settings, admin, etc.)
  // shouldn't be indexed -- their static HTML shell is technically
  // fetchable since Next.js prerenders every registered screen, but
  // there's nothing there for a search visitor and indexing them would
  // just dilute the real public pages' relevance.
  if (!info.public) {
    return {
      title: info.title,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: info.title,
    description: info.description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: info.title, description: info.description, url: `/${slug}` },
    twitter: { title: info.title, description: info.description },
  };
}

export default async function ScreenPage({ params }) {
  const { screen: slug } = await params;
  const info = screenInfo[slug];

  // A previous version of this returned 200 with "screen not found" content
  // instead of a real 404 -- a "soft 404" Google explicitly flags as a
  // problem (it wastes crawl budget and can get flagged in Search Console).
  // notFound() triggers Next's actual 404 status + the nearest not-found.js.
  if (!info) notFound();

  if (info.public) {
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://app.botimi.co.zw/" },
        { "@type": "ListItem", position: 2, name: info.title, item: `https://app.botimi.co.zw/${slug}` },
      ],
    };
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <info.Component />
      </>
    );
  }

  const { Component } = info;
  return <Component />;
}
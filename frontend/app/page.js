import LandingPage from "../components/screens/LandingPage";

export const metadata = {
  title: "botimi | AI Chatbots for Customer Support & Sales",
  description: "Deploy an AI chatbot trained on your website or documents in minutes — website widget and WhatsApp, with human handoff and a built-in support inbox when it can't answer. 14-day free trial, no card required.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// Organization + SoftwareApplication structured data for the homepage only
// (not repeated on every route) -- helps Google understand what botimi is
// and who runs it. Offers use the real international USD prices from
// backend/src/config.js; no ratings/reviews included since none exist yet
// (still early access -- fabricating an AggregateRating would be a false
// claim, not just an SEO nicety).
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "botimi",
    url: "https://app.botimi.co.zw",
    logo: "https://app.botimi.co.zw/icon.svg",
    sameAs: ["https://www.facebook.com/profile.php?id=61594304120870"],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "botimi",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "AI chatbot platform that trains on your website or documents and deploys to your site and WhatsApp, with human handoff and a support ticket inbox for anything it can't confidently answer.",
    url: "https://app.botimi.co.zw",
    offers: [
      { "@type": "Offer", name: "Starter", price: "39", priceCurrency: "USD" },
      { "@type": "Offer", name: "Growth", price: "99", priceCurrency: "USD" },
      { "@type": "Offer", name: "Business", price: "279", priceCurrency: "USD" },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}

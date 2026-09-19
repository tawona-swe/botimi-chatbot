const SITE_URL = "https://app.botimi.co.zw";

// Only real, public, indexable pages -- not the behind-auth app screens
// (see robots.js) and not /landing (redirects to / -- see next.config.mjs).
const routes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/enterprise", changeFrequency: "monthly", priority: 0.7 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.7 },
  { path: "/login", changeFrequency: "yearly", priority: 0.5 },
  { path: "/register", changeFrequency: "yearly", priority: 0.6 },
  { path: "/forgot-password", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap() {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

const SITE_URL = "https://app.botimi.co.zw";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Behind-auth app screens -- nothing here is useful to a search
      // visitor, and Next.js statically prerenders a shell for all of them
      // regardless of auth state (see [screen]/page.js), so they're
      // technically fetchable even though there's no reason to index them.
      disallow: [
        "/dashboard",
        "/support",
        "/onboarding",
        "/onboarding-plan",
        "/bots",
        "/analytics",
        "/settings",
        "/admin",
        "/accept-invite",
        "/reset-password",
        "/csat",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

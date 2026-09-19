// login/page.js is a client component ('use client', uses hooks) -- Next.js
// only allows metadata exports from server components, so this route-scoped
// layout is what actually supplies the title/description instead of every
// visitor to /login silently inheriting the generic homepage metadata.
export const metadata = {
  title: "Sign in",
  description: "Sign in to your botimi dashboard to manage your AI chatbots, view conversations, and check analytics.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

export default function LoginLayout({ children }) {
  return children;
}

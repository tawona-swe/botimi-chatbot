// See app/login/layout.js -- same reason: register/page.js is a client
// component and can't export metadata itself.
export const metadata = {
  title: "Create your account",
  description: "Start your 14-day free trial with botimi — no credit card required. Deploy an AI chatbot trained on your website or documents in minutes.",
  alternates: { canonical: "/register" },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }) {
  return children;
}

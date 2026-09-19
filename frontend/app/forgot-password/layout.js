// See app/login/layout.js -- same reason: forgot-password/page.js is a
// client component and can't export metadata itself.
export const metadata = {
  title: "Forgot your password?",
  description: "Reset your botimi account password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: true, follow: true },
};

export default function ForgotPasswordLayout({ children }) {
  return children;
}

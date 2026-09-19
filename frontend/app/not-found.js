import Link from "next/link";

// Rendered by Next.js whenever notFound() is called (see [screen]/page.js)
// or a route genuinely doesn't exist -- this is what makes the response a
// real HTTP 404 instead of the "soft 404" (200 with "not found" content)
// this app used to serve, which Google explicitly treats as a problem.
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
      <span className="relative inline-block text-headline-md font-extrabold text-primary" style={{ fontFamily: '"Outfit", sans-serif' }}>
        botimi
        <span className="absolute rounded-full bg-tertiary" style={{ width: "6px", height: "6px", top: "-2px", right: "-8px" }} />
      </span>
      <h1 className="text-3xl font-bold text-on-surface mt-4">Page not found</h1>
      <p className="text-on-surface-variant max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="mt-2 px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
        Back to botimi
      </Link>
    </main>
  );
}

"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-16">
          <Link href="/" target="_top" className="text-headline-md font-extrabold text-primary relative inline-block" style={{ fontFamily: '"Outfit", sans-serif' }}>
            botimi
            <span className="absolute rounded-full bg-tertiary" style={{ width: "6px", height: "6px", top: "-2px", right: "-8px" }} />
          </Link>
          <Link href="/" target="_top" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
            &larr; Back to home
          </Link>
        </nav>
      </header>

      <main className="flex-1 pt-32 pb-24 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[720px] mx-auto">
          <p className="font-label-md text-label-md text-primary mb-2">Legal</p>
          <h1 className="font-display text-headline-lg text-on-surface mb-2">Privacy Policy</h1>
          <p className="text-sm text-on-surface-variant mb-12">Last updated: September 19, 2026</p>

          <div className="space-y-10 text-on-surface [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-on-surface-variant [&_p]:mb-3 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-on-surface-variant [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">

            <section>
              <p>botimi ("we," "us," "our") provides an AI chatbot platform that businesses ("vendors," "you") use to train, deploy, and manage chatbots for their own customers. This policy covers the data we collect from you as a vendor using our dashboard and services. If you're an end customer chatting with a bot built on botimi, that conversation is governed by the privacy practices of the specific business you're talking to, not directly by botimi — we process that data on their behalf, as described below.</p>
            </section>

            <section>
              <h2>Information we collect</h2>
              <ul>
                <li><strong>Account information:</strong> your name, email, company name, industry, and country when you sign up.</li>
                <li><strong>Payment information:</strong> processed directly by Pesepay, our payment processor. We never see or store your full card number or mobile money PIN — we only receive confirmation that a payment succeeded or failed, and a reference number.</li>
                <li><strong>Content you provide to train your bot:</strong> website URLs and pages we crawl on your instruction, documents you upload, and any text or Q&A pairs you enter.</li>
                <li><strong>Conversation data:</strong> messages exchanged between your chatbot and your customers, on your website widget or WhatsApp Business number, so the bot can function, so you can view your own conversation history, and so we can generate the analytics and support-ticket features you use.</li>
                <li><strong>Usage data:</strong> login activity, feature usage, and conversation counts, used for billing (your conversation-credit balance) and to improve the product.</li>
              </ul>
            </section>

            <section>
              <h2>How we use this information</h2>
              <ul>
                <li>To operate the service — training your bot, running conversations, generating analytics, and processing escalations to your support inbox.</li>
                <li>To process payments and manage your subscription plan and credit balance.</li>
                <li>To send you transactional emails: a welcome email on signup, ticket and escalation alerts, payment receipts, low-credit and renewal reminders, and password-reset or team-invite links. These are operational, not marketing — we don't currently send promotional email campaigns.</li>
                <li>To respond when you contact support.</li>
                <li>To comply with legal obligations where applicable.</li>
              </ul>
            </section>

            <section>
              <h2>Who we share information with</h2>
              <p>We don't sell your data. We do share it with the following third parties, only as needed to run the service:</p>
              <ul>
                <li><strong>AI model providers</strong> (Groq, Google Gemini, OpenRouter, and OpenCode Zen) — process the content of chatbot conversations to generate responses. Your knowledge-base content and conversation text passes through whichever provider is generating that specific reply.</li>
                <li><strong>Pesepay</strong> — processes your payment transactions.</li>
                <li><strong>Meta / WhatsApp Business Platform</strong> — if you connect a WhatsApp number, messages sent and received also pass through Meta's infrastructure, governed additionally by Meta's own terms.</li>
                <li><strong>Resend</strong> — delivers the transactional emails described above on our behalf.</li>
                <li><strong>Google</strong> — if you choose to sign in with your Google account, Google authenticates you and shares your name and email with us.</li>
              </ul>
            </section>

            <section>
              <h2>Data storage and security</h2>
              <p>Passwords are never stored in plain text — we store a one-way cryptographic hash (bcrypt) that can't be reversed. Traffic to and from the service is encrypted (HTTPS). We have not obtained third-party security certifications (such as SOC 2 or ISO 27001) — if that matters for your own compliance needs, please contact us before relying on us for a use case that requires it.</p>
            </section>

            <section>
              <h2>Data retention and your rights</h2>
              <p>We retain your account and conversation data for as long as your account is active. If you'd like your data corrected, exported, or deleted, contact us at the email below — this is currently a manual process handled by our team on request, not a fully self-service export/delete tool.</p>
              <p>Depending on where you're based, you may have specific rights over your data — for example under Zimbabwe's Cyber and Data Protection Act, or the EU's GDPR if you're an EU-based user. We'll honor reasonable requests to access, correct, or delete your personal information.</p>
            </section>

            <section>
              <h2>Cookies and local storage</h2>
              <p>We use your browser's local storage to keep you signed in (your session token) and remember interface preferences like light/dark mode and sidebar state. We don't use third-party advertising or tracking cookies.</p>
            </section>

            <section>
              <h2>Children's privacy</h2>
              <p>botimi is a business tool and is not directed at, or knowingly used by, children.</p>
            </section>

            <section>
              <h2>Changes to this policy</h2>
              <p>If we make material changes to this policy, we'll update the date at the top of this page. Continuing to use botimi after a change means you accept the updated policy.</p>
            </section>

            <section>
              <h2>Contact us</h2>
              <p>Questions about this policy, or a data request? Email us at <a className="text-primary underline" href="mailto:support@botimi.co.zw">support@botimi.co.zw</a>.</p>
            </section>

          </div>
        </div>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant py-stack-xl">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-4">
          <Link href="/" target="_top" className="text-headline-md text-primary font-bold relative inline-block" style={{ fontFamily: '"Outfit", sans-serif' }}>
            botimi
            <span className="absolute rounded-full bg-tertiary" style={{ width: "6px", height: "6px", top: "-2px", right: "-8px" }} />
          </Link>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
            &copy; {new Date().getFullYear()} botimi AI Ecosystem. All rights reserved.
          </p>
          <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/terms" target="_top">
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>
    </div>
  );
}

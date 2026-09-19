"use client";

import Link from "next/link";

export default function TermsOfService() {
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
          <h1 className="font-display text-headline-lg text-on-surface mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-on-surface-variant mb-12">Last updated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="space-y-10 text-on-surface [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-on-surface-variant [&_p]:mb-3 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-on-surface-variant [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">

            <section>
              <p>These terms govern your use of botimi as a vendor account holder. By creating an account, you agree to them. See our <Link className="text-primary underline" href="/privacy" target="_top">Privacy Policy</Link> for how we handle your data.</p>
            </section>

            <section>
              <h2>What botimi is</h2>
              <p>botimi lets you train a chatbot on your own website content or uploaded documents, deploy it as a widget on your site and/or on WhatsApp Business, and manage conversations it can't confidently answer through a built-in support inbox with tickets and team seats.</p>
            </section>

            <section>
              <h2>Your account</h2>
              <ul>
                <li>You're responsible for the accuracy of the information you provide and for keeping your login credentials secure.</li>
                <li>One account has one owner; the owner can invite teammates as additional seats with their own login.</li>
                <li>You're responsible for activity that happens under your account, including anything your invited teammates do.</li>
              </ul>
            </section>

            <section>
              <h2>Plans, credits, and billing</h2>
              <ul>
                <li>New accounts get a 14-day free trial with no payment required upfront.</li>
                <li>Paid plans (Starter, Growth, Business) include a set number of conversation credits per month. Every conversation your bot has counts as one credit from a single running balance — renewals and optional top-up purchases both add to that balance, and unused credits don't expire mid-cycle.</li>
                <li>If your balance runs out before your next renewal, your bot hands new conversations to your support inbox instead of answering them automatically, until you top up or your plan renews.</li>
                <li>Zimbabwe-based accounts are billed at a discounted local rate via Ecocash or Omari mobile money (in USD or ZiG); international accounts are billed in USD via card or other redirect payment methods. Both rates are shown clearly before you pay.</li>
                <li>Accounts paying by Ecocash or Omari are renewed automatically each billing cycle. Accounts paying by card have no stored payment method, so you'll be emailed a reminder to renew manually — your subscription may be paused if it isn't renewed.</li>
                <li>All payments are processed by Pesepay. Refund requests are handled case by case — contact us at the email below.</li>
              </ul>
            </section>

            <section>
              <h2>Acceptable use</h2>
              <p>You agree not to use botimi to:</p>
              <ul>
                <li>Train or deploy a bot for illegal content, harassment, deception, or spam.</li>
                <li>Attempt to circumvent your plan's credit limits, security controls, or rate limits.</li>
                <li>Reverse-engineer, resell, or white-label the underlying platform beyond what your plan explicitly permits.</li>
                <li>Upload content you don't have the rights to use.</li>
              </ul>
              <p>We may suspend or terminate accounts that violate these terms, don't pay for an active subscription, or otherwise abuse the service.</p>
            </section>

            <section>
              <h2>Your content and AI-generated responses</h2>
              <p>You retain ownership of the website content, documents, and other material you provide to train your bot. By providing it, you give us permission to process it solely to operate your bot and the features you use.</p>
              <p><strong>Your bot's responses are generated by AI models and may be inaccurate or incomplete.</strong> You're responsible for reviewing what your bot is trained on and for how it's used with your own customers — botimi doesn't guarantee the accuracy of any specific response, and isn't responsible for decisions your customers make based on them.</p>
            </section>

            <section>
              <h2>Service availability</h2>
              <p>We aim to keep botimi reliably available but don't currently guarantee a specific uptime percentage or service-level agreement. We'll do our best to communicate planned maintenance or known issues.</p>
            </section>

            <section>
              <h2>Cancellation</h2>
              <p>You can stop using botimi and let your subscription lapse at any time from your account settings. We may suspend accounts for non-payment, following the reminders described above.</p>
            </section>

            <section>
              <h2>Limitation of liability</h2>
              <p>botimi is provided "as is." To the fullest extent permitted by law, we're not liable for indirect, incidental, or consequential damages arising from your use of the service, including losses resulting from your chatbot's responses to your own customers.</p>
            </section>

            <section>
              <h2>Governing law</h2>
              <p>These terms are governed by the laws of Zimbabwe.</p>
            </section>

            <section>
              <h2>Changes to these terms</h2>
              <p>If we make material changes, we'll update the date at the top of this page. Continuing to use botimi after a change means you accept the updated terms.</p>
            </section>

            <section>
              <h2>Contact us</h2>
              <p>Questions about these terms? Email us at <a className="text-primary underline" href="mailto:support@botimi.co.zw">support@botimi.co.zw</a>.</p>
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
          <Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-secondary transition-colors" href="/privacy" target="_top">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

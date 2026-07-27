import db, { migrate } from "./index.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("[Seed] Starting database seed...");

  // Run migration first
  migrate();

  const now = new Date().toISOString();
  const demoVendorId = "demo-vendor-001";
  const demoBotId = "demo-bot-001";
  const adminVendorId = "admin-vendor-001";

  // Check if demo vendor already exists
  const existing = db.prepare("SELECT id FROM vendors WHERE id = ?").get(demoVendorId);
  if (existing) {
    console.log("[Seed] Demo vendor already exists, skipping.");
    return;
  }

  // Hash password for demo@botimi.ai / password123
  const passwordHash = await bcrypt.hash("password123", 12);
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // ── Demo Vendor ──
  db.prepare(`
    INSERT INTO vendors (id, email, password_hash, name, company_name, industry,
      subscription_plan, subscription_status, conversations_used, conversations_limit,
      trial_ends_at, brand_color)
    VALUES (?, ?, ?, ?, ?, ?, 'growth', 'active', 0, 3000, ?, '#c0c1ff')
  `).run(demoVendorId, "demo@botimi.ai", passwordHash, "Demo User", "botimi Demo Corp", "Technology", trialEnd);
  console.log("[Seed] Created demo vendor: demo@botimi.ai / password123");

  // ── Super Admin Vendor ──
  const adminHash = await bcrypt.hash("admin123", 12);
  db.prepare(`
    INSERT INTO vendors (id, email, password_hash, name, company_name, industry,
      subscription_plan, subscription_status, is_superadmin, conversations_limit,
      trial_ends_at, brand_color)
    VALUES (?, ?, ?, ?, ?, ?, 'scale', 'active', 1, 999999, ?, '#ff6b6b')
  `).run(adminVendorId, "admin@botimi.ai", adminHash, "Super Admin", "botimi Platform", "Technology", trialEnd);
  console.log("[Seed] Created super admin: admin@botimi.ai / admin123");

  // ── Demo Bot ──
  db.prepare(`
    INSERT INTO bots (id, vendor_id, name, description, welcome_message, response_tone,
      model_provider, model_name, brand_color, quick_replies, is_active)
    VALUES (?, ?, 'botimi Demo Bot', 'A demo AI chatbot for testing', 'Hello! I am the botimi demo assistant. Ask me anything!',
      'friendly', 'groq', 'llama3-70b', '#c0c1ff', '["Pricing plans","API docs","Integrations","Talk to sales"]', 1)
  `).run(demoBotId, demoVendorId);
  console.log("[Seed] Created demo bot");

  // ── Knowledge Sources ──
  const sourceId = uuidv4();
  db.prepare(`
    INSERT INTO knowledge_sources (id, bot_id, vendor_id, type, title, url, status, chunk_count)
    VALUES (?, ?, ?, 'website_crawl', 'botimi Docs', 'https://botimi.ai/docs', 'indexed', 5)
  `).run(sourceId, demoBotId, demoVendorId);

  // ── Knowledge Chunks ──
  const chunks = [
    { content: "botimi is a multi-vendor AI chatbot SaaS platform that allows businesses to deploy trained AI chatbots on their websites via a single JavaScript snippet.", index: 0 },
    { content: "botimi offers three pricing plans: Starter at $29/month with 1 bot and 500 conversations, Growth at $79/month with 5 bots and 3,000 conversations, and Scale at $199/month with unlimited bots and 15,000 conversations.", index: 1 },
    { content: "botimi supports multiple integration methods including WordPress, Webflow, Shopify, Wix, and any custom website via a simple JS snippet. React and Next.js SDKs are also available.", index: 2 },
    { content: "The botimi AI uses Groq's LLM technology with RAG (Retrieval-Augmented Generation) to provide accurate answers based on your business documentation and knowledge base.", index: 3 },
    { content: "botimi provides detailed analytics including conversation volume, resolution rates, active sessions, average response time, and top customer questions to help optimize your chatbot.", index: 4 },
  ];

  const insertChunk = db.prepare(`
    INSERT INTO knowledge_chunks (id, source_id, bot_id, vendor_id, content, embedding, chunk_index, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const chunk of chunks) {
    insertChunk.run(
      uuidv4(), sourceId, demoBotId, demoVendorId,
      chunk.content, null, chunk.index,
      JSON.stringify({ url: "https://botimi.ai/docs", title: "botimi Documentation" })
    );
  }
  console.log("[Seed] Indexed 5 knowledge chunks");

  // ── Demo Conversations ──
  const conv1Id = uuidv4();
  const conv2Id = uuidv4();

  // Conversation 1 — resolved
  db.prepare(`
    INSERT INTO conversations (id, bot_id, vendor_id, visitor_id, visitor_name, status,
      source, message_count, resolved_by_bot, started_at)
    VALUES (?, ?, ?, ?, 'Alice Johnson', 'resolved', 'widget', 3, 1, datetime('now', '-2 days'))
  `).run(conv1Id, demoBotId, demoVendorId, uuidv4());

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms)
    VALUES (?, ?, 'user', 'Hi there! What are your pricing plans?', '', 0, 0)
  `).run(uuidv4(), conv1Id);
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms)
    VALUES (?, ?, 'bot', 'We offer three plans: Starter ($29/mo), Growth ($79/mo), and Scale ($199/mo). Each comes with a 14-day free trial and you can upgrade or cancel anytime!', 'llama3-70b', 85, 1200)
  `).run(uuidv4(), conv1Id);
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms)
    VALUES (?, ?, 'user', 'Great, thanks!', '', 0, 0)
  `).run(uuidv4(), conv1Id);

  // Conversation 2 — active
  db.prepare(`
    INSERT INTO conversations (id, bot_id, vendor_id, visitor_id, visitor_name, status,
      source, message_count, started_at)
    VALUES (?, ?, ?, ?, 'Bob Smith', 'active', 'widget', 5, datetime('now', '-30 minutes'))
  `).run(conv2Id, demoBotId, demoVendorId, uuidv4());

  const msgs = [
    { role: "user", content: "How do I integrate botimi with my Shopify store?" },
    { role: "bot", content: "Integrating botimi with Shopify is simple! Just copy your bot's embed code from the dashboard and paste it into your Shopify theme's HTML before the closing </body> tag, or use the Shopify 'Custom Liquid' section in your theme editor." },
    { role: "user", content: "Can I customize the look and feel?" },
    { role: "bot", content: "Absolutely! You can customize the widget theme (dark/light), brand color, position (bottom-left/bottom-right), welcome message, and even upload a custom avatar icon. All from the Bot Settings page." },
    { role: "user", content: "What about the response tone?" },
    { role: "bot", content: "You can choose from three tones: Professional (formal and precise), Friendly (warm and conversational), or Concise (short and direct). You can change this anytime in your bot settings." },
  ];

  for (const msg of msgs) {
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, model_used, tokens_used, latency_ms)
      VALUES (?, ?, ?, ?, 'llama3-70b', 70, 900)
    `).run(uuidv4(), conv2Id, msg.role, msg.content);
  }

  db.prepare("UPDATE vendors SET conversations_used = 2 WHERE id = ?").run(demoVendorId);

  // ── Demo Ticket ──
  const ticketId = uuidv4();
  db.prepare(`
    INSERT INTO tickets (id, vendor_id, conversation_id, ticket_number, subject, description,
      status, priority, customer_name, customer_email, source)
    VALUES (?, ?, ?, 'TKT-1001', 'Billing inquiry', 'I was charged twice for my subscription this month. Can you help?',
      'in_progress', 'high', 'Alice Johnson', 'alice@example.com', 'chat_escalation')
  `).run(ticketId, demoVendorId, conv1Id);

  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, author_type, author_name, body, is_internal_note)
    VALUES (?, ?, 'customer', 'Alice Johnson', 'I was charged twice for my subscription this month. Can you help?', 0)
  `).run(uuidv4(), ticketId);
  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, author_type, author_name, body, is_internal_note)
    VALUES (?, ?, 'agent', 'Support Team', 'Hi Alice, I apologize for the inconvenience! I can see the duplicate charge. I will initiate a refund right away. You should see the funds returned within 3-5 business days.', 0)
  `).run(uuidv4(), ticketId);
  db.prepare(`
    INSERT INTO ticket_replies (id, ticket_id, author_type, author_name, body, is_internal_note)
    VALUES (?, ?, 'agent', 'Support Team', 'Check if this is a recurring issue or one-time. Flag for billing team review.', 1)
  `).run(uuidv4(), ticketId);

  // Update first response time
  db.prepare(`
    UPDATE tickets SET first_response_at = datetime('now', '-1 hour') WHERE id = ?
  `).run(ticketId);

  console.log("[Seed] Created 2 demo conversations and 1 ticket");
  console.log("[Seed] ✅ Seed complete!");
  console.log("");
  console.log("  ┌─────────────────────────────────────────┐");
  console.log("  │  Demo Account                           │");
  console.log("  │  Email:    demo@botimi.ai              │");
  console.log("  │  Password: password123                  │");
  console.log("  │  Plan:     Growth ($79/mo)              │");
  console.log("  ├─────────────────────────────────────────┤");
  console.log("  │  Admin Account                          │");
  console.log("  │  Email:    admin@botimi.ai              │");
  console.log("  │  Password: admin123                     │");
  console.log("  │  Role:     Super Admin                  │");
  console.log("  └─────────────────────────────────────────┘");
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});

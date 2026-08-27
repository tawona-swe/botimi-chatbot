import { chatCompletion } from "./modelRouter.js";

const PRIORITY_TOOL = {
  type: "function",
  function: {
    name: "set_priority",
    description: "Classify how urgent/frustrated the customer's message is, to set the support ticket's priority.",
    parameters: {
      type: "object",
      properties: {
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "urgent = angry/blocking/business-critical, high = frustrated or time-sensitive, medium = normal request, low = minor/cosmetic/no rush",
        },
      },
      required: ["priority"],
    },
  },
};

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

/**
 * Classify a single message's urgency for ticket prioritization.
 * Falls back to 'medium' (the pre-existing default) on any failure — this
 * is a nice-to-have signal, not something that should ever block ticket
 * creation.
 */
export async function classifyPriority(message) {
  try {
    const result = await chatCompletion(
      [
        { role: "system", content: "Classify the urgency of the user's message by calling set_priority. Do not respond in text." },
        { role: "user", content: message.slice(0, 2000) },
      ],
      { temperature: 0, tools: [PRIORITY_TOOL], tool_choice: "required" }
    );

    const call = result.toolCalls?.[0];
    if (call?.function?.name === "set_priority") {
      const args = JSON.parse(call.function.arguments || "{}");
      if (VALID_PRIORITIES.includes(args.priority)) return args.priority;
    }
  } catch {
    // Fall through to default
  }
  return "medium";
}

/**
 * Summarize a conversation transcript in 1-2 sentences for an agent
 * picking up an escalated ticket. Falls back to an empty string on failure
 * (the UI already handles a missing summary gracefully).
 */
export async function summarizeConversation(messages) {
  try {
    const transcript = messages
      .slice(-20)
      .map((m) => `${m.role === "user" ? "Customer" : "Bot"}: ${m.content}`)
      .join("\n");

    const result = await chatCompletion(
      [
        { role: "system", content: "Summarize this customer support conversation in 1-2 short sentences for a human agent who hasn't seen it yet. Focus on what the customer needs. No preamble, just the summary." },
        { role: "user", content: transcript },
      ],
      { temperature: 0.3, maxTokens: 150 }
    );
    return (result.content || "").trim();
  } catch {
    return "";
  }
}

import { v4 as uuidv4 } from "uuid";

/**
 * Generate a short readable ticket number like TKT-8842.
 */
export function generateTicketNumber() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${num}`;
}

/**
 * Generate a short readable bot ID.
 */
export function generateBotId() {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `asst_${suffix}`;
}

/**
 * Generate an API key for widget authentication.
 */
export function generateApiKey() {
  const prefix = "bh_";
  const random = Array.from({ length: 24 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))
  ).join("");
  return `${prefix}${random}`;
}

export { v4 as uuid } from "uuid";

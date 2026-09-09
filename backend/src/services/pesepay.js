import crypto from "node:crypto";
import https from "node:https";
import config from "../config.js";

const HOSTS = {
  sandbox: "api.test.sandbox.pesepay.com",
  production: "api.pesepay.com",
};

const BASE_PATHS = {
  sandbox: "/payments-engine/",
  production: "/api/payments-engine/",
};

function encrypt(data) {
  const key = Buffer.from(config.pesepay.encryptionKey, "utf8");
  const iv = Buffer.from(config.pesepay.encryptionKey.slice(0, 16), "utf8");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return cipher.update(JSON.stringify(data), "utf8", "base64") + cipher.final("base64");
}

function decrypt(base64Payload) {
  const key = Buffer.from(config.pesepay.encryptionKey, "utf8");
  const iv = Buffer.from(config.pesepay.encryptionKey.slice(0, 16), "utf8");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const json = decipher.update(base64Payload, "base64", "utf8") + decipher.final("utf8");
  return JSON.parse(json);
}

// Pesepay's servers send a response Node's strict fetch()/undici HTTP parser
// rejects ("Missing expected CR after header value") — the official SDK works
// around this the same way, with insecureHTTPParser on its http client.
function request(method, path, bodyObj) {
  if (!config.pesepay.integrationKey) {
    throw new Error("Pesepay integration key not configured");
  }
  const env = config.pesepay.env === "production" ? "production" : "sandbox";
  const host = HOSTS[env];
  const fullPath = BASE_PATHS[env] + path;
  const body = bodyObj ? JSON.stringify(bodyObj) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        path: fullPath,
        method,
        insecureHTTPParser: true,
        headers: {
          authorization: config.pesepay.integrationKey,
          "content-type": "application/json",
          ...(body ? { "content-length": Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            return reject(new Error(`Pesepay returned non-JSON response (${res.statusCode}): ${data.slice(0, 200)}`));
          }
          if (res.statusCode >= 400) {
            return reject(new Error(parsed.message || `Pesepay API error (${res.statusCode})`));
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Initiate a seamless payment. `request` fields per Pesepay's Make Payment API:
 * amountDetails{amount,currencyCode}, merchantReference, reasonForPayment,
 * resultUrl, returnUrl, paymentMethodCode, customer{email,phoneNumber,name},
 * paymentMethodRequiredFields{customerPhoneNumber}.
 */
export async function makePayment(paymentRequest) {
  const encryptedPayload = encrypt(paymentRequest);
  const response = await request("POST", "v2/payments/make-payment", { payload: encryptedPayload });
  return decrypt(response.payload);
}

/**
 * Redirect-based transaction (used for card payments, to keep raw cardholder
 * data off botimi's servers — Pesepay hosts the actual card entry page).
 * `request` fields: amountDetails{amount,currencyCode}, reasonForPayment,
 * resultUrl, returnUrl, merchantReference. Response includes a redirectUrl
 * to send the customer's browser to, and (unlike make-payment) a populated
 * referenceNumber.
 */
export async function initiateTransaction(paymentRequest) {
  const encryptedPayload = encrypt(paymentRequest);
  const response = await request("POST", "v1/payments/initiate", { payload: encryptedPayload });
  return decrypt(response.payload);
}

export async function checkPaymentStatus(referenceNumber) {
  const response = await request("GET", `v1/payments/check-payment?referenceNumber=${encodeURIComponent(referenceNumber)}`);
  return decrypt(response.payload);
}

export async function getActiveCurrencies() {
  return request("GET", "v1/currencies/active");
}

export async function getPaymentMethodsByCurrency(currencyCode) {
  return request("GET", `v1/payment-methods/for-currency?currencyCode=${encodeURIComponent(currencyCode)}`);
}

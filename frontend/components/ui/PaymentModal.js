"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";

/**
 * Focused checkout modal for a single plan or top-up pack.
 *
 * Replaces the old pattern of expanding a phone-number/method form inline
 * inside a card sitting in a 3-column grid -- while that form was open, the
 * OTHER cards' own "Pay via Ecocash" / "Or pay by card" buttons were still
 * visible right next to it, all in a cramped grid cell. A modal gives the
 * actual checkout its own focused space and removes the other options from
 * view entirely while paying.
 *
 * itemType only changes which api.js endpoints get called and how the item
 * is labeled -- the UI itself is identical for a plan or a top-up pack.
 */
export default function PaymentModal({ item, itemType, onClose, onSuccess }) {
  const [method, setMethod] = useState("ecocash");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState(""); // "", "prompting", "success", "failed", "error"
  const [error, setError] = useState("");
  const [cardLoading, setCardLoading] = useState(false);

  // Reset whenever a new item is opened, so leftover state from a
  // previously-closed checkout never bleeds into the next one.
  useEffect(() => {
    setMethod("ecocash");
    setPhone("");
    setStatus("");
    setError("");
    setCardLoading(false);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    function onEscape(e) {
      if (e.key === "Escape" && status !== "prompting") onClose();
    }
    document.addEventListener("keydown", onEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, status, onClose]);

  if (!item) return null;

  const isTopUp = itemType === "topup";
  const title = isTopUp ? `${item.conversations.toLocaleString()} credits` : item.name;
  const subtitle = isTopUp ? "One-time top-up" : "Monthly plan";

  const checkout = (phoneNumber, selectedMethod) =>
    isTopUp ? api.pesepayTopUpCheckout(item.id, phoneNumber, selectedMethod) : api.pesepayCheckout(item.id, phoneNumber, selectedMethod);
  const cardCheckout = () => (isTopUp ? api.pesepayTopUpCheckoutCard(item.id) : api.pesepayCheckoutCard(item.id));

  const handlePay = async () => {
    if (!/^0\d{9}$/.test(phone)) {
      setError("Enter a valid phone number, e.g. 0771234567");
      return;
    }
    setError("");
    setStatus("prompting");
    try {
      const { referenceNumber } = await checkout(phone, method);
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { transactionStatus } = await api.pesepayStatus(referenceNumber);
        if (transactionStatus === "SUCCESS") {
          setStatus("success");
          await onSuccess?.();
          return;
        }
        if (transactionStatus === "FAILED") {
          setStatus("failed");
          return;
        }
      }
      setStatus("error");
      setError("Timed out waiting for confirmation. If you approved the PIN prompt, check back in a minute.");
    } catch (err) {
      console.error("Checkout failed:", err);
      setStatus("error");
      setError(err.message || "Payment failed to start.");
    }
  };

  const handleCardPay = async () => {
    setCardLoading(true);
    try {
      const { redirectUrl } = await cardCheckout();
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Card checkout failed:", err);
      setError(err.message || "Failed to start card payment.");
      setCardLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => status !== "prompting" && onClose()}
      />
      <div className="relative w-full max-w-md bg-surface-container border border-outline-variant rounded-3xl shadow-2xl p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto">
        {status !== "prompting" && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}

        {status === "success" ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">check_circle</span>
            <h2 className="font-display text-lg font-bold text-on-surface mb-2">Payment confirmed</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              {isTopUp ? "Your credits have been added." : "Your plan is now active."}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-on-primary rounded-xl text-sm font-bold py-3 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{subtitle}</p>
            <div className="flex items-baseline justify-between mb-6 pr-8">
              <h2 className="font-display text-xl font-bold text-on-surface">{title}</h2>
              <span className="font-display text-2xl font-bold text-primary whitespace-nowrap">
                ${item.price}
                {!isTopUp && <span className="text-xs text-on-surface-variant">/mo</span>}
              </span>
            </div>

            {status === "prompting" ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-primary text-4xl animate-pulse mb-3">phone_iphone</span>
                <p className="text-sm text-on-surface">Check your phone and enter your PIN to confirm…</p>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Pay with</label>
                <div className="flex gap-2 p-1 bg-surface-container-lowest border border-outline-variant rounded-xl mb-4">
                  {["ecocash", "omari"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
                        method === m ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0771234567"
                  autoFocus
                  className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {error && <p className="text-xs text-error mb-2">{error}</p>}
                {status === "failed" && (
                  <button onClick={() => setStatus("")} className="text-xs text-primary font-semibold mb-2">
                    Try again
                  </button>
                )}

                <button
                  onClick={handlePay}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all mb-4"
                >
                  Pay with {method === "omari" ? "Omari" : "Ecocash"}
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-outline-variant" />
                  <span className="text-[11px] text-on-surface-variant/70 font-medium">or</span>
                  <div className="flex-1 h-px bg-outline-variant" />
                </div>

                <button
                  onClick={handleCardPay}
                  disabled={cardLoading}
                  className="w-full py-2.5 border border-outline-variant bg-surface-container-lowest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {cardLoading
                    ? "Redirecting…"
                    : item.cardPrice !== item.price
                      ? `Pay by card ($${item.cardPrice}${isTopUp ? "" : "/mo"}, Zimswitch, Innbucks & more)`
                      : "Pay by card, Zimswitch, Innbucks & more"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

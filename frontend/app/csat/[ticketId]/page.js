"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "../../../lib/api";

export default function CsatPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCsatTicket(ticketId)
      .then((data) => {
        setTicket(data.ticket);
        if (data.ticket.csat_rating) setSubmitted(true);
      })
      .catch((err) => setError(err.message || "This link isn't valid."))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setError("");
    try {
      await api.submitCsat(ticketId, rating, comment);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .material-symbols-outlined.filled { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface-container border border-outline-variant rounded-2xl p-8 text-center">
          <Link href="/" className="font-display text-headline-md font-extrabold text-primary block mb-6">botimi</Link>

          {loading ? (
            <p className="text-sm text-on-surface-variant">Loading...</p>
          ) : error && !ticket ? (
            <p className="text-sm text-error">{error}</p>
          ) : submitted ? (
            <>
              <span className="material-symbols-outlined text-5xl text-primary mb-3 filled" style={{ display: "block" }}>favorite</span>
              <h1 className="font-display text-lg font-bold text-on-surface mb-1">Thanks for the feedback!</h1>
              <p className="text-sm text-on-surface-variant">We appreciate you taking the time to rate ticket {ticket?.ticket_number}.</p>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="font-display text-lg font-bold text-on-surface mb-1">How did we do?</h1>
              <p className="text-sm text-on-surface-variant mb-6">Ticket {ticket?.ticket_number} — {ticket?.subject}</p>

              <div className="flex items-center justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="p-1"
                  >
                    <span className={`material-symbols-outlined text-4xl transition-colors ${n <= rating ? "text-amber-400 filled" : "text-on-surface-variant/30"}`}>star</span>
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Anything you'd like to add? (optional)"
                rows={3}
                className="w-full bg-surface-container-lowest border border-outline-variant p-3 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none mb-4"
              />

              {error && <p className="text-xs text-error mb-3">{error}</p>}

              <button
                type="submit"
                disabled={!rating || submitting}
                className="w-full px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

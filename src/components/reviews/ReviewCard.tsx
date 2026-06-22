"use client";
import { useState } from "react";

export type ReviewPublic = {
  id: number;
  rating: number;
  comment: string | null;
  author_name: string;
  locale: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

export function ReviewCard({ review, locale }: { review: ReviewPublic; locale: string }) {
  const stored = typeof window !== "undefined" ? (window.localStorage.getItem("cd-review-votes") ?? "{}") : "{}";
  const initial: Record<string, -1 | 0 | 1> = (() => { try { return JSON.parse(stored); } catch { return {}; } })();
  const [vote, setVote] = useState<-1 | 0 | 1>(initial[review.id] ?? 0);
  const [score, setScore] = useState(review.upvotes - review.downvotes);
  const [reported, setReported] = useState(false);

  async function castVote(next: -1 | 0 | 1) {
    const delta = next - vote;
    setScore((s) => s + delta);
    setVote(next);
    const map = { ...initial, [review.id]: next };
    try { window.localStorage.setItem("cd-review-votes", JSON.stringify(map)); } catch {}
    try {
      await fetch("/api/reviews/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_id: review.id, value: next }) });
    } catch {}
  }

  async function report(reason: "spam" | "abuse" | "offtopic") {
    setReported(true);
    try { await fetch("/api/reviews/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_id: review.id, reason }) }); } catch {}
  }

  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(review.created_at));

  return (
    <article className="rounded-2xl border border-sand-warm bg-white p-4">
      <header className="flex items-center justify-between text-sm">
        <span className="font-heading text-base">{review.author_name}</span>
        <span className="opacity-60">{date}</span>
      </header>
      <div className="mt-1 text-sea">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
      {review.comment && <p className="mt-2 whitespace-pre-line">{review.comment}</p>}
      <footer className="mt-3 flex items-center gap-3 text-sm">
        <button onClick={() => castVote(vote === 1 ? 0 : 1)} className={vote === 1 ? "text-sea font-bold" : "opacity-70"}>▲</button>
        <span>{score}</span>
        <button onClick={() => castVote(vote === -1 ? 0 : -1)} className={vote === -1 ? "text-terracotta font-bold" : "opacity-70"}>▼</button>
        <span className="ml-auto">
          {reported ? <em className="opacity-60">signalé</em> : (
            <details>
              <summary className="cursor-pointer opacity-60">signaler</summary>
              <div className="mt-1 flex gap-1">
                <button onClick={() => report("spam")}>spam</button>
                <button onClick={() => report("abuse")}>abus</button>
                <button onClick={() => report("offtopic")}>hors-sujet</button>
              </div>
            </details>
          )}
        </span>
      </footer>
    </article>
  );
}

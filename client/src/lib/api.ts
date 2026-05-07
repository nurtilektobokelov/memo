export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type Category = "Language" | "Cert" | "Subject" | "General";

export interface APIDeck {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  color: string | null;
  userId: number;
  createdAt: string;
  _count?: { cards: number };
}

export interface APICard {
  id: number;
  front: string;
  back: string;
  imageUrl: string | null;
  audioUrl: string | null;
  deckId: number;
  createdAt: string;
  nextReview: string;
  state: string;
  interval: number;
  ease: number;
  lapses: number;
  reviewCount?: number;
}

export interface APISRSResult {
  state: string;
  interval: number;
  ease: number;
  lapses: number;
  nextReview: string;
  nextReviewLabel: string;
}

export const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Language: { bg: "var(--memo-pink-light)",   color: "var(--memo-pink)",   border: "1px solid var(--memo-pink)" },
  Cert:     { bg: "var(--memo-blue-light)",   color: "var(--memo-blue)",   border: "1px solid var(--memo-blue)" },
  Subject:  { bg: "var(--memo-accent-light)", color: "var(--memo-accent)", border: "1px solid var(--memo-accent)" },
  General:  { bg: "var(--memo-amber-light)",  color: "var(--memo-amber)",  border: "1px solid var(--memo-amber)" },
};

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

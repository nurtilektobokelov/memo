import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, CATEGORY_STYLE } from "../lib/api.ts";
import type { APIDeck, APICard } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<APIDeck[]>([]);
  const [dueMap, setDueMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch<APIDeck[]>(`/api/decks?userId=${user.id}`)
      .then(async (data) => {
        setDecks(data);
        const entries = await Promise.all(
          data.map(async (d) => {
            try {
              const due = await apiFetch<APICard[]>(`/api/decks/${d.id}/due`);
              return [d.id, due.length] as const;
            } catch {
              return [d.id, 0] as const;
            }
          }),
        );
        setDueMap(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const totalDue = Object.values(dueMap).reduce((s, n) => s + n, 0);
  const totalCards = decks.reduce((s, d) => s + (d._count?.cards ?? 0), 0);
  const dueDeckIds = decks.filter((d) => (dueMap[d.id] ?? 0) > 0);
  const firstDueDeck = dueDeckIds[0];

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.greeting}>Welcome</h1>
        <p className={styles.subtitle}>Ready to start studying?</p>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Due today</div>
          <div className={styles.metricValue}>{totalDue}</div>
          <div className={styles.metricSub}>
            {dueDeckIds.length > 0
              ? `across ${dueDeckIds.length} deck${dueDeckIds.length !== 1 ? "s" : ""}`
              : "all caught up!"}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total cards</div>
          <div className={`${styles.metricValue} ${styles.metricPurple}`}>{totalCards}</div>
          <div className={styles.metricSub}>across {decks.length} deck{decks.length !== 1 ? "s" : ""}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Decks</div>
          <div className={`${styles.metricValue} ${styles.metricGreen}`}>{decks.length}</div>
          <div className={styles.metricSub}>active subjects</div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Due today</h2>
        </div>

        {dueDeckIds.length === 0 ? (
          <p className={styles.emptyState}>
            {decks.length === 0
              ? "No decks yet — create one in My Decks to get started."
              : "You're all caught up! Nothing due today."}
          </p>
        ) : (
          <>
            <div className={styles.deckGrid}>
              {dueDeckIds.map((deck) => {
                const dueCount = dueMap[deck.id] ?? 0;
                const totalDeckCards = deck._count?.cards ?? 0;
                const cat = deck.category ?? "General";
                const catStyle = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE["General"]!;
                const reviewedToday = Math.max(0, totalDeckCards - dueCount);
                const pct = totalDeckCards > 0 ? Math.round((reviewedToday / totalDeckCards) * 100) : 0;

                return (
                  <button
                    key={deck.id}
                    className={styles.deckCard}
                    onClick={() => void navigate(`/decks/${deck.id}/study`)}
                  >
                    <div className={styles.deckName}>{deck.name}</div>
                    <span
                      className={styles.categoryTag}
                      style={{ background: catStyle.bg, color: catStyle.color, border: catStyle.border }}
                    >
                      {cat}
                    </span>
                    <div className={styles.deckDue}>
                      <span className={styles.dueBadge}>{dueCount} due</span>
                    </div>
                    <div className={styles.progressWrap}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.progressLabel}>{pct}% reviewed</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {firstDueDeck && (
              <button
                className={styles.startButton}
                onClick={() => void navigate(`/decks/${firstDueDeck.id}/study`)}
              >
                Start today's review →
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

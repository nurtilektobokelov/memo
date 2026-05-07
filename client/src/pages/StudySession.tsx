import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api.ts";
import type { APICard, APISRSResult } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./StudySession.module.css";

const RATINGS: { label: string; value: 1 | 2 | 3 | 4; sub: string }[] = [
  { label: "Again", value: 1, sub: "1 min"  },
  { label: "Hard",  value: 2, sub: "8 min"  },
  { label: "Good",  value: 3, sub: "15 min" },
  { label: "Easy",  value: 4, sub: "4 days" },
];

export default function StudySession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deckId = Number(id);

  const [queue, setQueue] = useState<APICard[]>([]);
  const [graduatedIds, setGraduatedIds] = useState<Set<number>>(new Set());
  const [totalUnique, setTotalUnique] = useState(0);
  const [nextDue, setNextDue] = useState<{ timeLabel: string | null } | null>(null);

  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [ratingTint, setRatingTint] = useState<"again" | "easy" | null>(null);
  const [pendingRating, setPendingRating] = useState<{ value: 1 | 2 | 3 | 4 } | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    apiFetch<APICard[]>(`/api/decks/${deckId}/due`)
      .then((due) => {
        setQueue(due);
        setTotalUnique(due.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deckId]);

  useEffect(() => {
    if (loading || totalUnique > 0) return;
    apiFetch<{ nextDue: string | null; timeLabel: string | null }>(`/api/decks/${deckId}/next-due`)
      .then(setNextDue)
      .catch(() => {});
  }, [loading, totalUnique, deckId]);

  const currentCard = queue[0] ?? null;
  const noDue = !loading && totalUnique === 0;
  const isDone = !loading && totalUnique > 0 && queue.length === 0;
  const progress = totalUnique > 0 ? graduatedIds.size / totalUnique : 0;

  const handleFlip = () => {
    if (!isFlipped && !isAdvancing && pendingRating === null) {
      setIsFlipped(true);
      setExplanation(null);
    }
  };

  const handleExplain = async () => {
    if (!currentCard || explainLoading) return;
    setExplainLoading(true);
    try {
      const data = await apiFetch<{ explanation: string }>("/api/ai/explain", {
        method: "POST",
        body: JSON.stringify({
          front: currentCard.front,
          back: currentCard.back,
          deckName: "",
          userRating: 0,
        }),
      });
      setExplanation(data.explanation);
    } catch {
      setExplanation("Sorry, couldn't get an explanation right now. Try again.");
    } finally {
      setExplainLoading(false);
    }
  };

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    if (!isFlipped || isAdvancing || pendingRating !== null) return;
    const card = queue[0];
    if (!card) return;

    setPendingRating({ value: rating });
    setIsAdvancing(true);

    if (rating === 1) setRatingTint("again");
    else if (rating === 4) setRatingTint("easy");

    setIsFlipped(false);
    setExplanation(null);

    apiFetch<APISRSResult>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        cardId: card.id,
        userId: user?.id,
        rating,
        currentState: card.state,
        currentInterval: card.interval,
        currentEase: card.ease,
        currentLapses: card.lapses ?? 0,
      }),
    }).catch(() => {
      setToast({ msg: "Couldn't save rating, continuing…", error: true });
    });

    setTimeout(() => {
      if (rating === 1) {
        const cardState = card.state ?? "new";
        let newState = cardState;
        let newInterval = card.interval;
        let newEase = card.ease;
        let newLapses = card.lapses ?? 0;

        if (newState === "new" || newState === "learning") {
          newState = "learning"; newInterval = 1 / 1440;
        } else {
          newState = "learning"; newLapses += 1;
          newEase = Math.max(newEase - 0.20, 1.3); newInterval = 1 / 1440;
        }

        const updatedCard: APICard = { ...card, state: newState, interval: newInterval, ease: newEase, lapses: newLapses };
        setQueue((prev) => [...prev.slice(1), updatedCard]);
      } else if (rating === 2) {
        setQueue((prev) => prev.slice(1));
      } else {
        setQueue((prev) => prev.slice(1));
        setGraduatedIds((prev) => new Set([...prev, card.id]));
      }
    }, 175);

    setTimeout(() => setRatingTint(null), 300);
    setTimeout(() => {
      setPendingRating(null);
      setIsAdvancing(false);
      setToast(null);
    }, 800);
  };

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>Loading cards…</p>
      </div>
    );
  }

  if (noDue) {
    return (
      <div className={styles.centered}>
        <div className={styles.doneCheckmark}>✓</div>
        <h2 className={styles.doneTitle}>All done for now!</h2>
        <p className={styles.doneSub}>
          {nextDue?.timeLabel
            ? `Next card due ${nextDue.timeLabel}.`
            : "You're all caught up. Come back later to keep your streak."}
        </p>
        <div className={styles.doneActions}>
          <button className={styles.primaryBtn} onClick={() => void navigate(`/decks/${deckId}`)}>
            Back to deck
          </button>
          <button className={styles.outlineBtn} onClick={() => void navigate("/")}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isDone) {
    const graduated = graduatedIds.size;
    const stillLearning = totalUnique - graduated;
    return (
      <div className={styles.centered}>
        <div className={styles.doneCheckmark}>✓</div>
        <h2 className={styles.doneTitle}>Session complete!</h2>
        <div className={styles.doneStats}>
          <div className={styles.doneStat}>
            <span className={styles.doneStatNum}>{totalUnique}</span>
            <span className={styles.doneStatLabel}>cards studied</span>
          </div>
          <div className={styles.doneStat}>
            <span className={`${styles.doneStatNum} ${styles.doneStatGreen}`}>{graduated}</span>
            <span className={styles.doneStatLabel}>graduated</span>
          </div>
          {stillLearning > 0 && (
            <div className={styles.doneStat}>
              <span className={`${styles.doneStatNum} ${styles.doneStatAmber}`}>{stillLearning}</span>
              <span className={styles.doneStatLabel}>still learning</span>
            </div>
          )}
        </div>
        <p className={styles.doneSub}>
          {stillLearning === 0
            ? "Perfect session! You graduated every card."
            : graduated === 0
              ? "Keep at it — repetition builds memory!"
              : `${graduated} card${graduated !== 1 ? "s" : ""} locked in, ${stillLearning} to practice more.`}
        </p>
        <div className={styles.doneActions}>
          <button className={styles.outlineBtn} onClick={() => void navigate(`/decks/${deckId}`)}>
            Back to deck
          </button>
          <button className={styles.primaryBtn} onClick={() => void navigate("/")}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.sessionHeader}>
        <button className={styles.backBtn} onClick={() => void navigate(`/decks/${deckId}`)}>
          ← Back
        </button>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
          </div>
          <div className={styles.progressRight}>
            <span className={styles.progressText}>{queue.length} left</span>
          </div>
        </div>
      </div>

      <div className={styles.cardArea}>
        <div className={styles.hint}>
          {isFlipped ? "Rate how well you remembered" : "Tap the card to reveal the answer"}
        </div>

        <div
          className={`${styles.perspective} ${isAdvancing ? styles.advancing : ""} ${
            ratingTint === "again" ? styles.cardTintAgain : ratingTint === "easy" ? styles.cardTintEasy : ""
          }`}
        >
          <div
            className={`${styles.card} ${isFlipped ? styles.flipped : ""} ${isAdvancing ? styles.advancing : ""}`}
            onClick={handleFlip}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFlip(); }}
            aria-label={isFlipped ? "Card back" : "Card front — click to flip"}
          >
            <div className={`${styles.face} ${styles.front}`}>
              <p className={styles.faceLabel}>Front</p>
              <p className={styles.faceText}>{currentCard?.front}</p>
            </div>
            <div className={`${styles.face} ${styles.back}`}>
              <p className={styles.faceLabel}>Back</p>
              <p className={styles.faceText}>{currentCard?.back}</p>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className={styles.explainWrap}>
          {explanation === null && (
            <button
              className={styles.explainBtn}
              onClick={() => void handleExplain()}
              disabled={explainLoading}
            >
              {explainLoading ? (
                <span className={styles.explainLoading}>
                  <span className={styles.explainSpinner} />
                  memo is thinking…
                </span>
              ) : (
                "✦ Explain this"
              )}
            </button>
          )}
          {explanation !== null && (
            <div className={styles.explainPanel}>{explanation}</div>
          )}
        </div>
      )}

      <div className={styles.ratings}>
        {RATINGS.map((r) => {
          const isPending = pendingRating?.value === r.value;
          const isDisabled = !isFlipped || (isAdvancing && !isPending) || (pendingRating !== null && !isPending);
          return (
            <button
              key={r.value}
              className={`${styles.ratingBtn} ${isPending ? styles.ratingBtnPending : ""}`}
              disabled={isDisabled}
              onClick={() => handleRate(r.value)}
            >
              <span className={styles.ratingLabel}>{r.label}</span>
              <span className={`${styles.ratingInterval} ${isPending ? styles.ratingIntervalActive : ""}`}>
                {r.sub}
              </span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div className={`${styles.toastWrap} ${toast.error ? styles.toastError : ""}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

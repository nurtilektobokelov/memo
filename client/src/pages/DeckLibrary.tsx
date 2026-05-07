import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, CATEGORY_STYLE } from "../lib/api.ts";
import type { APIDeck, APICard } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./DeckLibrary.module.css";

const CATEGORIES = ["Language", "Cert", "Subject", "General"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_DECK_COLOR: Record<Category, string> = {
  Language: "#FBEAF0",
  Cert: "#FAEEDA",
  Subject: "#E1F5EE",
  General: "#EEEDFE",
};

interface NewDeckForm {
  name: string;
  description: string;
  category: Category;
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export default function DeckLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<APIDeck[]>([]);
  const [dueMap, setDueMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewDeckForm>({ name: "", description: "", category: "General" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<APIDeck | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDecks = () => {
    if (!user) return;
    setLoading(true);
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
      .catch(() => { setDecks([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDecks(); }, [user?.id]);

  const openModal = () => {
    setForm({ name: "", description: "", category: "General" });
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name.trim()) { setError("Deck name is required."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const deck = await apiFetch<APIDeck>("/api/decks", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category,
          color: CATEGORY_DECK_COLOR[form.category],
          userId: user.id,
        }),
      });
      setDecks((prev) => [deck, ...prev]);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deck.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/decks/${deleteTarget.id}`, { method: "DELETE" });
      setDecks((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
    } finally {
      setDeleting(false);
    }
  };

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
        <div>
          <h1 className={styles.title}>My Decks</h1>
          <p className={styles.subtitle}>{decks.length} deck{decks.length !== 1 ? "s" : ""} · study at your own pace</p>
        </div>
        <button className={styles.newButton} onClick={openModal}>
          + New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No decks yet</h2>
          <p className={styles.emptyDesc}>Create your first deck to start studying with spaced repetition.</p>
          <button className={styles.emptyBtn} onClick={openModal}>
            + Create your first deck
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((deck) => {
            const cat = deck.category ?? "General";
            const catStyle = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE["General"]!;
            const cardCount = deck._count?.cards ?? 0;
            const dueCount = dueMap[deck.id] ?? 0;
            const studyLabel =
              cardCount === 0 ? "No cards yet" :
              dueCount > 0    ? `Study (${dueCount} due)` :
                                "No cards due";
            const studyDisabled = cardCount === 0 || dueCount === 0;

            return (
              <div
                key={deck.id}
                className={styles.card}
                onClick={() => void navigate(`/decks/${deck.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void navigate(`/decks/${deck.id}`); }}
              >
                <div className={styles.cardTop}>
                  <span
                    className={styles.categoryTag}
                    style={{ background: catStyle.bg, color: catStyle.color, border: catStyle.border }}
                  >
                    {cat}
                  </span>
                  <span className={styles.cardCount}>{cardCount} card{cardCount !== 1 ? "s" : ""}</span>
                </div>
                <h3 className={styles.deckName}>{deck.name}</h3>
                {deck.description && (
                  <p className={styles.deckDesc}>{deck.description}</p>
                )}
                <div className={styles.cardFooter}>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.studyBtn}
                      onClick={(e) => { e.stopPropagation(); if (!studyDisabled) void navigate(`/decks/${deck.id}/study`); }}
                      disabled={studyDisabled}
                      title={dueCount === 0 && cardCount > 0 ? "No cards due right now" : undefined}
                    >
                      {studyLabel}
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(deck); }}
                      title="Delete deck"
                      aria-label={`Delete ${deck.name}`}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New deck</h2>
              <button className={styles.closeBtn} onClick={closeModal} aria-label="Close">✕</button>
            </div>

            <label className={styles.fieldLabel}>Name *</label>
            <input
              className={styles.input}
              placeholder="e.g. Japanese N3 Vocab"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />

            <label className={styles.fieldLabel}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="What will you study?"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />

            <label className={styles.fieldLabel}>Category</label>
            <div className={styles.categoryPicker}>
              {CATEGORIES.map((cat) => {
                const s = CATEGORY_STYLE[cat]!;
                return (
                  <button
                    key={cat}
                    className={`${styles.catOption} ${form.category === cat ? styles.catSelected : ""}`}
                    style={form.category === cat ? { background: s.bg, color: s.color, borderColor: s.color } : {}}
                    onClick={() => setForm((p) => ({ ...p, category: cat }))}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button className={styles.createBtn} onClick={() => void handleCreate()} disabled={submitting}>
                {submitting ? "Creating…" : "Create deck"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete "{deleteTarget.name}"?</h2>
              <button className={styles.closeBtn} onClick={() => setDeleteTarget(null)} aria-label="Close">✕</button>
            </div>
            <p className={styles.deleteModalBody}>
              This will permanently delete the deck and all{" "}
              <strong>{deleteTarget._count?.cards ?? 0} card{(deleteTarget._count?.cards ?? 0) !== 1 ? "s" : ""}</strong>{" "}
              inside it. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className={styles.deleteDeckBtn} onClick={() => void handleDeleteDeck()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete deck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, CATEGORY_STYLE } from "../lib/api.ts";
import type { APIDeck, APICard } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./DeckDetail.module.css";

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  );
}

type SortBy = "date" | "alpha" | "interval";
type FilterBy = "all" | "notStudied" | "learning" | "mastered";

function cardStatus(card: APICard): "notStudied" | "learning" | "mastered" {
  if (card.state === "new") return "notStudied";
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (!card.nextReview || new Date(card.nextReview) <= in24h) return "learning";
  return "mastered";
}

function getNextReviewLabel(card: APICard): { label: string; color: "green" | "blue" } | null {
  if (card.state === "new") return null;
  const now = new Date();
  const next = new Date(card.nextReview);
  const diffMs = next.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffMs <= 0) return { label: "Due now", color: "green" };
  if (diffMs <= 24 * 60 * 60 * 1000) {
    if (diffMins < 60) return { label: `In ${diffMins} min`, color: "green" };
    return { label: `In ${Math.round(diffMins / 60)} hr`, color: "green" };
  }
  if (diffDays < 2) return { label: "Tomorrow", color: "blue" };
  return { label: `In ${diffDays} days`, color: "blue" };
}

export default function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const deckId = Number(id);

  const [deck, setDeck] = useState<APIDeck | null>(null);
  const [cards, setCards] = useState<APICard[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [nextDue, setNextDue] = useState<{ nextDue: string | null; timeLabel: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);

  const [openCardMenuId, setOpenCardMenuId] = useState<number | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [deleteDeckConfirm, setDeleteDeckConfirm] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);

  const [editCardTarget, setEditCardTarget] = useState<APICard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [editCardError, setEditCardError] = useState<string | null>(null);

  const [deleteCardTarget, setDeleteCardTarget] = useState<APICard | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [allDecks, cardList] = await Promise.all([
          apiFetch<APIDeck[]>(`/api/decks?userId=${user?.id}`),
          apiFetch<APICard[]>(`/api/decks/${deckId}/cards`),
        ]);
        setDeck(allDecks.find((d) => d.id === deckId) ?? null);
        setCards(cardList);
      } catch {
      }
      try {
        const dueList = await apiFetch<APICard[]>(`/api/decks/${deckId}/due`);
        setDueCount(dueList.length);
      } catch {
        setDueCount(0);
      }
      setLoading(false);
    };
    void fetchAll();
  }, [deckId]);

  useEffect(() => {
    if (loading || dueCount > 0) return;
    apiFetch<{ nextDue: string | null; timeLabel: string | null }>(`/api/decks/${deckId}/next-due`)
      .then(setNextDue)
      .catch(() => {});
  }, [loading, dueCount, deckId]);

  useEffect(() => {
    if (!pageMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
        setPageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pageMenuOpen]);

  useEffect(() => {
    if (openCardMenuId === null) return;
    const handler = (e: MouseEvent) => {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setOpenCardMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openCardMenuId]);

  const openAddCard = () => {
    setNewFront("");
    setNewBack("");
    setNewImageUrl("");
    setAddCardError(null);
    setAddCardOpen(true);
  };

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    setAddingCard(true);
    setAddCardError(null);
    try {
      const card = await apiFetch<APICard>(`/api/decks/${deckId}/cards`, {
        method: "POST",
        body: JSON.stringify({
          front: newFront.trim(),
          back: newBack.trim(),
          imageUrl: newImageUrl.trim() || undefined,
        }),
      });
      setCards((prev) => [...prev, card]);
      setAddCardOpen(false);
    } catch {
      setAddCardError("Failed to add card. Please try again.");
    } finally {
      setAddingCard(false);
    }
  };

  const handleDeleteDeck = async () => {
    setDeletingDeck(true);
    try {
      await apiFetch(`/api/decks/${deckId}`, { method: "DELETE" });
      void navigate("/decks");
    } catch {
      setDeletingDeck(false);
    }
  };

  const startEditingName = () => {
    setNameInput(deck?.name ?? "");
    setEditingName(true);
  };

  const handleRenameDeck = async () => {
    if (!nameInput.trim() || savingName) return;
    setSavingName(true);
    try {
      const updated = await apiFetch<APIDeck>(`/api/decks/${deckId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      setDeck(updated);
      setEditingName(false);
    } catch {
    } finally {
      setSavingName(false);
    }
  };

  const openEditCard = (card: APICard) => {
    setEditFront(card.front);
    setEditBack(card.back);
    setEditImageUrl(card.imageUrl ?? "");
    setEditCardError(null);
    setEditCardTarget(card);
  };

  const handleEditCard = async () => {
    if (!editCardTarget || !editFront.trim() || !editBack.trim()) return;
    setSavingCard(true);
    setEditCardError(null);
    try {
      const updated = await apiFetch<APICard>(`/api/cards/${editCardTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          front: editFront.trim(),
          back: editBack.trim(),
          imageUrl: editImageUrl.trim() || null,
        }),
      });
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditCardTarget(null);
    } catch {
      setEditCardError("Failed to save changes. Please try again.");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget) return;
    setDeletingCard(true);
    try {
      await apiFetch(`/api/cards/${deleteCardTarget.id}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== deleteCardTarget.id));
      setDeleteCardTarget(null);
    } catch {
    } finally {
      setDeletingCard(false);
    }
  };

  const notStudiedCount = cards.filter((c) => cardStatus(c) === "notStudied").length;
  const learningCount = cards.filter((c) => cardStatus(c) === "learning").length;
  const masteredCount = cards.filter((c) => cardStatus(c) === "mastered").length;
  const masteredPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  const filteredCards = cards
    .filter((c) => {
      if (filterBy !== "all" && cardStatus(c) !== filterBy) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "alpha") return a.front.localeCompare(b.front);
      if (sortBy === "interval") return b.interval - a.interval;
      return 0;
    });

  const cat = deck?.category ?? "General";
  const catStyle = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE["General"]!;

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <button className={styles.backBtn} onClick={() => void navigate("/decks")}>
          ← Back
        </button>
        <div className={styles.pageMenuWrap} ref={pageMenuRef}>
          <button
            className={styles.dotsBtn}
            onClick={() => setPageMenuOpen((o) => !o)}
            aria-label="More options"
          >
            <IconDots />
          </button>
          {pageMenuOpen && (
            <div className={styles.dropdownMenu}>
              <button
                className={styles.dropdownItem}
                onClick={() => { setPageMenuOpen(false); void navigate(`/decks/${deckId}/import`); }}
              >
                ✦ AI Import
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => { setPageMenuOpen(false); startEditingName(); }}
              >
                Rename deck
              </button>
              <div className={styles.dropdownDivider} />
              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                onClick={() => { setPageMenuOpen(false); setDeleteDeckConfirm(true); }}
              >
                Delete deck
              </button>
            </div>
          )}
        </div>
      </div>

      {deck && (
        <div className={styles.deckMeta}>
          <span
            className={styles.categoryTag}
            style={{ background: catStyle.bg, color: catStyle.color, border: catStyle.border }}
          >
            {cat}
          </span>
          <h1 className={styles.deckName}>{deck.name}</h1>
          {deck.description && <p className={styles.deckDesc}>{deck.description}</p>}
        </div>
      )}

      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.heroLeft}>
            <div className={styles.heroDue}>{dueCount}</div>
            <div className={styles.heroDueLabel}>cards for today</div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatPip} data-status="notStudied" />
              <span className={styles.heroStatValue}>{notStudiedCount}</span>
              <span className={styles.heroStatLabel}>Not studied</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatPip} data-status="learning" />
              <span className={styles.heroStatValue}>{learningCount}</span>
              <span className={styles.heroStatLabel}>Learning</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatPip} data-status="mastered" />
              <span className={styles.heroStatValue}>{masteredCount}</span>
              <span className={styles.heroStatLabel}>Mastered</span>
            </div>
          </div>
        </div>
        {cards.length > 0 && dueCount === 0 ? (
          <div className={styles.heroAllCaughtUp}>
            <span className={styles.heroCheckmark}>✓</span>
            <div>
              <div className={styles.heroAllCaughtUpText}>All caught up!</div>
              {nextDue?.timeLabel && (
                <div className={styles.heroNextDue}>Next review {nextDue.timeLabel}</div>
              )}
            </div>
          </div>
        ) : (
          <button
            className={styles.heroStudyBtn}
            onClick={() => void navigate(`/decks/${deckId}/study`)}
            disabled={cards.length === 0}
          >
            {cards.length === 0
              ? "Add cards to start studying"
              : `Study now · ${dueCount} due`}
          </button>
        )}
      </div>

      <div className={styles.cardsSection}>
        <div className={styles.cardsSectionHeader}>
          <h2 className={styles.cardsSectionTitle}>
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {cards.length > 0 && (
          <div className={styles.progressArea}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${masteredPct}%` }} />
            </div>
            <div className={styles.progressLegend}>
              <span className={styles.legendItem} data-status="notStudied">
                <span className={styles.legendDot} />
                Not studied ({notStudiedCount})
              </span>
              <span className={styles.legendItem} data-status="learning">
                <span className={styles.legendDot} />
                Learning ({learningCount})
              </span>
              <span className={styles.legendItem} data-status="mastered">
                <span className={styles.legendDot} />
                Mastered ({masteredCount})
              </span>
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div className={styles.controls}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}><IconSearch /></span>
              <input
                className={styles.searchInput}
                placeholder="Search cards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => setSearch("")} aria-label="Clear search">✕</button>
              )}
            </div>
            <div className={styles.controlsRight}>
              <select
                className={styles.select}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date">Date added</option>
                <option value="alpha">A → Z</option>
                <option value="interval">Interval</option>
              </select>
              <select
                className={styles.select}
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterBy)}
              >
                <option value="all">All</option>
                <option value="notStudied">Not studied</option>
                <option value="learning">Learning</option>
                <option value="mastered">Mastered</option>
              </select>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No cards yet</p>
            <p className={styles.emptyDesc}>Add cards manually or generate them with AI.</p>
            <button
              className={styles.emptyImportBtn}
              onClick={() => void navigate(`/decks/${deckId}/import`)}
            >
              ✦ Generate with AI
            </button>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className={styles.noResults}>
            No cards match your search.{" "}
            <button
              className={styles.clearFiltersBtn}
              onClick={() => { setSearch(""); setFilterBy("all"); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={styles.cardList}>
            {filteredCards.map((card) => {
              const status = cardStatus(card);
              const reviewLabel = getNextReviewLabel(card);
              const badgeIcon =
                reviewLabel?.color === "green" ? "⏱ " :
                reviewLabel?.color === "accent" ? "✓ " :
                reviewLabel ? "◆ " : null;
              return (
                <div key={card.id} className={styles.cardRow}>
                  <span className={styles.statusDot} data-status={status} />
                  <div className={styles.cardContent}>
                    <div className={styles.cardFrontWrap}>
                      {reviewLabel && (
                        <span className={`${styles.reviewBadge} ${
                          reviewLabel.color === "green" ? styles.reviewBadgeGreen :
                          reviewLabel.color === "blue" ? styles.reviewBadgeBlue :
                          styles.reviewBadgeAccent
                        }`}>
                          {badgeIcon}{reviewLabel.label}
                        </span>
                      )}
                      <div className={styles.cardFront}>{card.front}</div>
                    </div>
                    <div className={styles.cardBack}>{card.back}</div>
                  </div>
                  <div
                    className={styles.cardMenuWrap}
                    ref={openCardMenuId === card.id ? cardMenuRef : undefined}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      className={styles.cardDotsBtn}
                      onClick={() => setOpenCardMenuId((prev) => (prev === card.id ? null : card.id))}
                      aria-label="Card options"
                    >
                      <IconDots />
                    </button>
                    {openCardMenuId === card.id && (
                      <div className={styles.cardDropdown}>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => { setOpenCardMenuId(null); openEditCard(card); }}
                        >
                          Edit
                        </button>
                        <div className={styles.dropdownDivider} />
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => { setOpenCardMenuId(null); setDeleteCardTarget(card); }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className={styles.floatingAddBtn} onClick={openAddCard} aria-label="Add card">
        <IconPlus />
        Add cards
      </button>

      {toast && <div className={styles.toast}>{toast}</div>}

      {addCardOpen && (
        <div className={styles.modalOverlay} onClick={() => setAddCardOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add card</h3>
              <button className={styles.modalCloseBtn} onClick={() => setAddCardOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Front</label>
              <textarea
                className={styles.modalTextarea}
                placeholder="Question or prompt…"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Back</label>
              <textarea
                className={styles.modalTextarea}
                placeholder="Answer or explanation…"
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                Image URL <span className={styles.optional}>(optional)</span>
              </label>
              <input
                type="url"
                className={styles.modalInput}
                placeholder="https://…"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
            </div>

            {addCardError && <div className={styles.modalError}>{addCardError}</div>}

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setAddCardOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.modalSaveBtn}
                onClick={() => void handleAddCard()}
                disabled={addingCard || !newFront.trim() || !newBack.trim()}
              >
                {addingCard ? "Adding…" : "Add card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDeckConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deletingDeck && setDeleteDeckConfirm(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Delete "{deck?.name}"?</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setDeleteDeckConfirm(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className={styles.deleteModalBody}>
              This will permanently delete the deck and all{" "}
              <strong>{cards.length} card{cards.length !== 1 ? "s" : ""}</strong>{" "}
              inside it. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteDeckConfirm(false)}
                disabled={deletingDeck}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={() => void handleDeleteDeck()}
                disabled={deletingDeck}
              >
                {deletingDeck ? "Deleting…" : "Delete deck"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editCardTarget && (
        <div className={styles.modalOverlay} onClick={() => !savingCard && setEditCardTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit card</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setEditCardTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Front</label>
              <textarea
                className={styles.modalTextarea}
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Back</label>
              <textarea
                className={styles.modalTextarea}
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                Image URL <span className={styles.optional}>(optional)</span>
              </label>
              <input
                type="url"
                className={styles.modalInput}
                placeholder="https://…"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
            </div>

            {editCardError && <div className={styles.modalError}>{editCardError}</div>}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditCardTarget(null)}
                disabled={savingCard}
              >
                Cancel
              </button>
              <button
                className={styles.modalSaveBtn}
                onClick={() => void handleEditCard()}
                disabled={savingCard || !editFront.trim() || !editBack.trim()}
              >
                {savingCard ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingName && (
        <div className={styles.modalOverlay} onClick={() => !savingName && setEditingName(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Rename deck</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setEditingName(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Deck name</label>
              <input
                className={styles.modalInput}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRenameDeck();
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setEditingName(false)}
                disabled={savingName}
              >
                Cancel
              </button>
              <button
                className={styles.modalSaveBtn}
                onClick={() => void handleRenameDeck()}
                disabled={savingName || !nameInput.trim()}
              >
                {savingName ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCardTarget && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deletingCard && setDeleteCardTarget(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Delete card?</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setDeleteCardTarget(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className={styles.deleteModalBody}>
              This will permanently delete this card and its review history. This cannot be undone.
            </p>
            <div className={styles.deletePreview}>
              <div className={styles.deletePreviewFront}>{deleteCardTarget.front}</div>
              <div className={styles.deletePreviewBack}>{deleteCardTarget.back}</div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setDeleteCardTarget(null)}
                disabled={deletingCard}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={() => void handleDeleteCard()}
                disabled={deletingCard}
              >
                {deletingCard ? "Deleting…" : "Delete card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

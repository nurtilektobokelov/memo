import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, API_BASE, CATEGORY_STYLE } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import type { APIDeck } from "../lib/api.ts";
import styles from "./AIImport.module.css";

type ProposedCard = { front: string; back: string };
type Mode = "prompt" | "document";
type CardFormat = "definition" | "qa" | "translation";
type Stage = "configure" | "selecting" | "success";

const FORMAT_LABELS: Record<CardFormat, string> = {
  definition: "Definition",
  qa: "Q&A",
  translation: "Translation",
};

const FORMAT_EXAMPLES: Record<CardFormat, string> = {
  definition: "Atom  /  Basic unit of matter",
  qa: "Who wrote 'Romeo and Juliet'?  /  Shakespeare",
  translation: "Hola  /  Hello",
};

const FORMAT_BADGE_CLASS: Record<CardFormat, string> = {
  definition: styles.badgeDefinition,
  qa: styles.badgeQa,
  translation: styles.badgeTranslation,
};

const LANGUAGES = [
  "Albanian", "Amharic", "Arabic", "Armenian", "Bengali", "Bosnian",
  "Bulgarian", "Burmese", "Catalan", "Chinese", "Croatian", "Czech",
  "Danish", "Dutch", "English", "Estonian", "Finnish", "French",
  "Georgian", "German", "Greek", "Gujarati", "Hindi", "Hungarian",
  "Icelandic", "Indonesian", "Italian", "Japanese", "Kannada", "Kazakh",
  "Korean", "Latvian", "Lithuanian", "Macedonian", "Malay", "Malayalam",
  "Marathi", "Mongolian", "Norwegian", "Persian", "Polish", "Portuguese",
  "Punjabi", "Romanian", "Russian", "Serbian", "Slovak", "Slovenian",
  "Somali", "Spanish", "Swahili", "Swedish", "Tagalog", "Tamil",
  "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Uzbek",
  "Vietnamese", "Welsh", "Zulu",
];

export default function AIImport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("configure");
  const [mode, setMode] = useState<Mode>("prompt");
  const [decks, setDecks] = useState<APIDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(id ?? "");
  const [cardFormat, setCardFormat] = useState<CardFormat>("qa");
  const [cardCountStr, setCardCountStr] = useState("20");
  const cardCount = Math.min(40, Math.max(1, parseInt(cardCountStr, 10) || 20));
  const [frontLanguage, setFrontLanguage] = useState("English");
  const [backLanguage, setBackLanguage] = useState("Spanish");

  const [prompt, setPrompt] = useState("");
  const [improvingPrompt, setImprovingPrompt] = useState(false);

  const [documentText, setDocumentText] = useState("");
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [documentStats, setDocumentStats] = useState<{
    pages: number;
    wordCount: number;
  } | null>(null);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [generatedCards, setGeneratedCards] = useState<ProposedCard[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editedCards, setEditedCards] = useState<Record<number, ProposedCard>>({});
  const [expandedEditIndex, setExpandedEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ProposedCard>({ front: "", back: "" });
  const [activeFormat, setActiveFormat] = useState<CardFormat>("qa");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<APIDeck[]>(`/api/decks?userId=${user?.id}`)
      .then((data) => setDecks(data))
      .catch(() => setDecks([]));
  }, [user?.id]);

  const selectedDeck = decks.find((d) => String(d.id) === selectedDeckId);

  const handleImprovePrompt = async () => {
    if (!prompt.trim() || improvingPrompt) return;
    setImprovingPrompt(true);
    try {
      const result = await apiFetch<{ improved: string }>("/api/ai/improve-prompt", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setPrompt(result.improved);
    } catch {
    } finally {
      setImprovingPrompt(false);
    }
  };

  const processPdfFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("PDF must be under 10 MB.");
      return;
    }
    setExtractingPdf(true);
    setError(null);
    setDocumentText("");
    setDocumentStats(null);
    setDocumentFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/ai/extract-pdf`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error((err as { error: string }).error ?? "Upload failed");
      }
      const data = (await res.json()) as {
        text: string;
        pages: number;
        wordCount: number;
      };
      setDocumentText(data.text);
      setDocumentStats({ pages: data.pages, wordCount: data.wordCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract PDF text.");
      setDocumentFileName(null);
    } finally {
      setExtractingPdf(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processPdfFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfFile(file);
  };

  const removeDocument = () => {
    setDocumentText("");
    setDocumentFileName(null);
    setDocumentStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canGenerate =
    !loading &&
    selectedDeckId !== "" &&
    (mode === "prompt" ? prompt.trim() !== "" : documentText !== "");

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);

    try {
      const langFields = cardFormat === "translation"
        ? { frontLanguage, backLanguage }
        : {};

      const body =
        mode === "prompt"
          ? {
              mode: "prompt",
              prompt: prompt.trim(),
              deckId: selectedDeckId,
              userId: user?.id,
              cardFormat,
              cardCount,
              ...langFields,
            }
          : {
              mode: "document",
              documentText,
              deckId: selectedDeckId,
              userId: user?.id,
              cardFormat,
              cardCount,
              ...langFields,
            };

      const cards = await apiFetch<ProposedCard[]>("/api/ai/generate-cards", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setGeneratedCards(cards);
      setSelectedIndices(new Set(cards.map((_, i) => i)));
      setActiveFormat(cardFormat);
      setStage("selecting");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate cards. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (!generatedCards) return;
    setSelectedIndices(
      selectedIndices.size === generatedCards.length
        ? new Set()
        : new Set(generatedCards.map((_, i) => i)),
    );
  };

  const toggleCard = (i: number) => {
    const next = new Set(selectedIndices);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedIndices(next);
  };

  const handleSave = async () => {
    if (!generatedCards || selectedIndices.size === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const toSave = generatedCards
        .map((card, i) => (editedCards[i] ?? card))
        .filter((_, i) => selectedIndices.has(i));
      await Promise.all(
        toSave.map((card) =>
          apiFetch(`/api/decks/${selectedDeckId}/cards`, {
            method: "POST",
            body: JSON.stringify({ front: card.front, back: card.back }),
          }),
        ),
      );
      setSavedCount(toSave.length);
      setStage("success");
    } catch {
      setSaveError("Failed to save some cards. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMore = () => {
    setGeneratedCards(null);
    setSelectedIndices(new Set());
    setEditedCards({});
    setExpandedEditIndex(null);
    setStage("configure");
    setError(null);
  };

  const breadcrumb = (
    <div className={styles.breadcrumb}>
      <span
        className={styles.breadcrumbLink}
        onClick={() => void navigate("/")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && void navigate("/")}
      >
        Home
      </span>
      <span className={styles.breadcrumbSep}>/</span>
      {selectedDeck ? (
        <>
          <span
            className={styles.breadcrumbLink}
            onClick={() => void navigate(`/decks/${selectedDeck.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && void navigate(`/decks/${selectedDeck.id}`)
            }
          >
            {selectedDeck.name}
          </span>
          <span className={styles.breadcrumbSep}>/</span>
        </>
      ) : null}
      <span className={styles.breadcrumbCurrent}>AI flashcard generator</span>
    </div>
  );

  if (stage === "success") {
    const cat = selectedDeck?.category ?? "General";
    const catStyle = CATEGORY_STYLE[cat] ?? CATEGORY_STYLE["General"]!;

    return (
      <div className={styles.shell}>
        {breadcrumb}
        <div className={styles.successWrap}>
          <div className={styles.successIcon}>✦</div>
          <h1 className={styles.successTitle}>
            {savedCount} card{savedCount !== 1 ? "s" : ""} saved!
          </h1>
          <p className={styles.successSub}>
            Added to{" "}
            <span style={{ color: catStyle.color, fontWeight: 700 }}>
              {selectedDeck?.name ?? "your deck"}
            </span>
          </p>
          <div className={styles.successActions}>
            <button className={styles.outlineBtn} onClick={handleGenerateMore}>
              Generate more
            </button>
            <button
              className={styles.primaryBtn}
              onClick={() => void navigate(`/decks/${selectedDeckId}`)}
            >
              View deck →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "selecting" && generatedCards) {
    const allSelected = selectedIndices.size === generatedCards.length;

    return (
      <div className={styles.shell}>
        {breadcrumb}
        <button className={styles.backBtn} onClick={handleGenerateMore}>
          ← Regenerate
        </button>

        <div className={styles.selectionHeader}>
          <h1 className={styles.selectionTitle}>
            {generatedCards.length} card{generatedCards.length !== 1 ? "s" : ""} generated
          </h1>
          <p className={styles.selectionSub}>
            Review and uncheck any cards you don't want to keep.
          </p>
        </div>

        <div className={styles.selectionToolbar}>
          <button className={styles.toggleAllBtn} onClick={toggleAll}>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className={styles.selectedCount}>
            {selectedIndices.size} of {generatedCards.length} selected
          </span>
        </div>

        <div className={styles.cardSelectList}>
          {generatedCards.map((baseCard, i) => {
            const card = editedCards[i] ?? baseCard;
            const isExpanded = expandedEditIndex === i;
            const isEdited = Boolean(editedCards[i]);
            return (
              <div
                key={i}
                className={`${styles.cardSelectRow} ${!selectedIndices.has(i) ? styles.cardSelectRowDimmed : ""} ${isExpanded ? styles.cardSelectRowExpanded : ""}`}
              >
                <input
                  type="checkbox"
                  className={styles.cardCheckbox}
                  checked={selectedIndices.has(i)}
                  onChange={() => toggleCard(i)}
                />
                <div className={styles.cardSelectContent}>
                  <div className={styles.cardSelectTop}>
                    <span className={`${styles.formatBadge} ${FORMAT_BADGE_CLASS[activeFormat]}`}>
                      {FORMAT_LABELS[activeFormat]}
                    </span>
                    <span className={styles.cardSelectIndex}>#{i + 1}</span>
                    {isEdited && <span className={styles.editedBadge}>edited</span>}
                    <button
                      className={styles.cardEditBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        if (isExpanded) {
                          setExpandedEditIndex(null);
                        } else {
                          setEditDraft({ front: card.front, back: card.back });
                          setExpandedEditIndex(i);
                        }
                      }}
                      title={isExpanded ? "Collapse" : "Edit card"}
                      type="button"
                    >
                      {isExpanded ? "✕" : "✏"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className={styles.cardEditForm}>
                      <textarea
                        className={styles.cardEditTextarea}
                        value={editDraft.front}
                        onChange={(e) => setEditDraft((d) => ({ ...d, front: e.target.value }))}
                        placeholder="Front…"
                        rows={2}
                      />
                      <textarea
                        className={styles.cardEditTextarea}
                        value={editDraft.back}
                        onChange={(e) => setEditDraft((d) => ({ ...d, back: e.target.value }))}
                        placeholder="Back…"
                        rows={2}
                      />
                      <button
                        className={styles.cardEditDoneBtn}
                        type="button"
                        disabled={!editDraft.front.trim() || !editDraft.back.trim()}
                        onClick={() => {
                          if (!editDraft.front.trim() || !editDraft.back.trim()) return;
                          setEditedCards((prev) => ({ ...prev, [i]: { front: editDraft.front.trim(), back: editDraft.back.trim() } }));
                          setExpandedEditIndex(null);
                        }}
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className={styles.cardSelectPair}>
                      <div className={styles.cardSelectFront}>{card.front}</div>
                      <span className={styles.cardSelectArrow}>→</span>
                      <div className={styles.cardSelectBack}>{card.back}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {saveError && <div className={styles.errorMsg}>{saveError}</div>}

        <div className={styles.selectionActions}>
          <button className={styles.outlineBtn} onClick={handleGenerateMore}>
            ← Regenerate
          </button>
          <button
            className={styles.primaryBtn}
            onClick={() => void handleSave()}
            disabled={saving || selectedIndices.size === 0}
          >
            {saving ? (
              <span className={styles.btnInner}>
                <span className={styles.btnSpinner} />
                Saving…
              </span>
            ) : (
              `Save ${selectedIndices.size} selected card${selectedIndices.size !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {breadcrumb}
      <button
        className={styles.backBtn}
        onClick={() => void navigate(id ? `/decks/${id}` : "/decks")}
      >
        ← {id ? "Back to deck" : "My Decks"}
      </button>

      <div className={styles.pageHeader}>
        <div className={styles.sparkle}>✦</div>
        <h1 className={styles.title}>AI flashcard generator</h1>
      </div>

      <div className={styles.formCard}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "prompt" ? styles.tabActive : ""}`}
            onClick={() => { setMode("prompt"); setError(null); }}
          >
            ✦ Custom prompt
          </button>
          <button
            className={`${styles.tab} ${mode === "document" ? styles.tabActive : ""}`}
            onClick={() => { setMode("document"); setError(null); }}
          >
            ↑ Upload a document
          </button>
        </div>

        {mode === "prompt" && (
          <div className={styles.modeSection}>
            <label className={styles.fieldLabel}>Topic / Prompt</label>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                placeholder="e.g. Common trigonometric functions and identities"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
              />
              <button
                className={styles.wandBtn}
                onClick={() => void handleImprovePrompt()}
                disabled={!prompt.trim() || improvingPrompt}
                title="Improve prompt with AI"
                type="button"
              >
                {improvingPrompt ? (
                  <span className={styles.wandSpinner} />
                ) : (
                  "✦"
                )}
              </button>
            </div>
            {improvingPrompt && (
              <p className={styles.improvingHint}>Improving your prompt…</p>
            )}
          </div>
        )}

        {mode === "document" && (
          <div className={styles.modeSection}>
            {!documentFileName ? (
              <div
                className={`${styles.uploadZone} ${isDragOver ? styles.uploadZoneDragOver : ""} ${extractingPdf ? styles.uploadZoneLoading : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !extractingPdf && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                {extractingPdf ? (
                  <>
                    <span className={styles.uploadSpinner} />
                    <p className={styles.uploadText}>Extracting text…</p>
                  </>
                ) : (
                  <>
                    <div className={styles.pdfIcon}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                        <line x1="9" y1="11" x2="11" y2="11" />
                      </svg>
                    </div>
                    <p className={styles.uploadText}>Drop your PDF here</p>
                    <p className={styles.uploadSub}>or click to browse</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className={styles.fileInput}
                  onChange={handleFileInput}
                />
              </div>
            ) : (
              <div className={styles.uploadedFile}>
                <div className={styles.uploadedFileInfo}>
                  <span className={styles.uploadedFileIcon}>📄</span>
                  <div>
                    <p className={styles.uploadedFileName}>{documentFileName}</p>
                    {documentStats && (
                      <p className={styles.uploadedFileStats}>
                        {documentStats.pages} page{documentStats.pages !== 1 ? "s" : ""} ·{" "}
                        ~{documentStats.wordCount.toLocaleString()} words
                      </p>
                    )}
                  </div>
                </div>
                <button className={styles.removeFileBtn} onClick={removeDocument} type="button">
                  ✕
                </button>
              </div>
            )}

            {documentText && (
              <div className={styles.textPreview}>
                <p className={styles.textPreviewLabel}>Extracted text preview</p>
                <p className={styles.textPreviewContent}>
                  {documentText.slice(0, 300)}
                  {documentText.length > 300 ? "…" : ""}
                </p>
              </div>
            )}
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.settings}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Add cards to deck</label>
            <select
              className={styles.select}
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
            >
              <option value="">Select a deck…</option>
              {decks.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Card format</label>
            <select
              className={styles.select}
              value={cardFormat}
              onChange={(e) => setCardFormat(e.target.value as CardFormat)}
            >
              <option value="definition">Definition / Meaning</option>
              <option value="qa">Question / Answer</option>
              <option value="translation">Word / Translation</option>
            </select>
            <p className={styles.formatExample}>{FORMAT_EXAMPLES[cardFormat]}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Cards to generate</label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.numberInput}
              value={cardCountStr}
              onChange={(e) => setCardCountStr(e.target.value.replace(/\D/g, "").slice(0, 2))}
              onBlur={() => {
                const n = parseInt(cardCountStr, 10);
                if (!n || n < 1) setCardCountStr("1");
                else if (n > 40) setCardCountStr("40");
                else setCardCountStr(String(n));
              }}
            />
            <p className={styles.fieldHint}>max 40 cards</p>
          </div>

          {cardFormat === "translation" && (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Front Side</label>
                <select
                  className={styles.select}
                  value={frontLanguage}
                  onChange={(e) => setFrontLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Back Side</label>
                <select
                  className={styles.select}
                  value={backLanguage}
                  onChange={(e) => setBackLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button
          className={styles.generateBtn}
          onClick={() => void handleGenerate()}
          disabled={!canGenerate}
        >
          {loading ? (
            <span className={styles.btnInner}>
              <span className={styles.btnSpinner} />
              <span>
                memo AI is generating your cards
                <span className={styles.dot1}>.</span>
                <span className={styles.dot2}>.</span>
                <span className={styles.dot3}>.</span>
              </span>
            </span>
          ) : (
            <span className={styles.btnInner}>
              <span className={styles.generateBtnIcon}>✦</span>
              Generate
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

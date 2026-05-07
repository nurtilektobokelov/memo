import { useState } from "react";
import { apiFetch } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./Settings.module.css";

export default function Settings() {
  const { user, refreshUser } = useAuth();

  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal ?? 20);
  const [newCardsPerDay, setNewCardsPerDay] = useState(user?.newCardsPerDay ?? 10);
  const [reminderOn, setReminderOn] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{ text: string; error?: boolean } | null>(null);

  if (!user) return null;

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    setPrefsMsg(null);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ dailyGoal, newCardsPerDay }),
      });
      await refreshUser();
      setPrefsMsg({ text: "Preferences saved." });
    } catch (err) {
      setPrefsMsg({
        text: err instanceof Error ? err.message : "Save failed.",
        error: true,
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Study preferences</h2>

        <div className={styles.field}>
          <div className={styles.sliderHeader}>
            <label className={styles.label}>Daily goal</label>
            <span className={styles.sliderValue}>{dailyGoal} cards</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={5}
            max={100}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
          />
          <div className={styles.sliderRange}>
            <span>5</span>
            <span>100</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.sliderHeader}>
            <label className={styles.label}>New cards per day</label>
            <span className={styles.sliderValue}>{newCardsPerDay} cards</span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={50}
            value={newCardsPerDay}
            onChange={(e) => setNewCardsPerDay(Number(e.target.value))}
          />
          <div className={styles.sliderRange}>
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.toggleRow}>
            <div>
              <div className={styles.label}>Study reminder</div>
              <div className={styles.toggleSub}>
                Get notified when you have cards due
              </div>
            </div>
            <button
              className={`${styles.toggle} ${reminderOn ? styles.toggleOn : ""}`}
              onClick={() => setReminderOn((v) => !v)}
              aria-pressed={reminderOn}
              aria-label="Study reminder"
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        {prefsMsg && (
          <div className={`${styles.msg} ${prefsMsg.error ? styles.msgError : styles.msgSuccess}`}>
            {prefsMsg.text}
          </div>
        )}

        <button
          className={styles.primaryBtn}
          onClick={() => void handleSavePrefs()}
          disabled={savingPrefs}
        >
          {savingPrefs ? "Saving…" : "Save preferences"}
        </button>
      </section>
    </div>
  );
}

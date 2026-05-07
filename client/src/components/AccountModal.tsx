import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api.ts";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./AccountModal.module.css";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<{ text: string; error?: boolean } | null>(null);

  if (!open || !user) return null;

  function EyeIcon({ visible }: { visible: boolean }) {
    if (visible) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  const isOAuth = user.provider === "google" || user.provider === "github";

  const initials = user.name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileMsg({ text: "Name cannot be empty.", error: true });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      await refreshUser();
      setProfileMsg({ text: "Profile updated." });
    } catch (err) {
      setProfileMsg({
        text: err instanceof Error ? err.message : "Update failed.",
        error: true,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match.", error: true });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ text: "New password must be at least 8 characters.", error: true });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await apiFetch("/api/users/me/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({
        text: err instanceof Error ? err.message : "Password change failed.",
        error: true,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await apiFetch("/api/users/me", { method: "DELETE" });
      await logout();
      void navigate("/login", { replace: true });
    } catch {
      setDangerMsg({ text: "Failed to delete account.", error: true });
      setDeleteAccountOpen(false);
      setDeletingAccount(false);
    }
  };

  const handleClose = () => {
    setProfileMsg(null);
    setPasswordMsg(null);
    setDangerMsg(null);
    setDeleteAccountOpen(false);
    setDeleteConfirmText("");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Account</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.profileHero}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className={styles.heroAvatar}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={styles.heroInitials}>{initials}</div>
          )}
          <div className={styles.heroInfo}>
            <div className={styles.heroName}>{user.name}</div>
            <div className={styles.heroEmail}>{user.email}</div>
          </div>
        </div>

        <div className={styles.divider} />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>

          <div className={styles.field}>
            <label className={styles.label}>Display name</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={`${styles.input} ${styles.inputReadonly}`}
              value={user.email}
              readOnly
            />
          </div>

          {profileMsg && (
            <div className={`${styles.msg} ${profileMsg.error ? styles.msgError : styles.msgSuccess}`}>
              {profileMsg.text}
            </div>
          )}

          <button
            className={styles.primaryBtn}
            onClick={() => void handleSaveProfile()}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving…" : "Save"}
          </button>
        </section>

        <div className={styles.divider} />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Password</h3>

          {isOAuth ? (
            <p className={styles.oauthNote}>
              Your account is managed by{" "}
              {user.provider === "google" ? "Google" : "GitHub"}. Password change
              is not available.
            </p>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Current password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    className={styles.input}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowCurrentPw((v) => !v)}
                    aria-label={showCurrentPw ? "Hide password" : "Show password"}
                  >
                    <EyeIcon visible={showCurrentPw} />
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showNewPw ? "text" : "password"}
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowNewPw((v) => !v)}
                    aria-label={showNewPw ? "Hide password" : "Show password"}
                  >
                    <EyeIcon visible={showNewPw} />
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm new password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowConfirmPw((v) => !v)}
                    aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  >
                    <EyeIcon visible={showConfirmPw} />
                  </button>
                </div>
              </div>

              {passwordMsg && (
                <div className={`${styles.msg} ${passwordMsg.error ? styles.msgError : styles.msgSuccess}`}>
                  {passwordMsg.text}
                </div>
              )}

              <button
                className={styles.primaryBtn}
                onClick={() => void handleChangePassword()}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Updating…" : "Change password"}
              </button>
            </>
          )}
        </section>

        <div className={styles.divider} />

        <section className={styles.dangerSection}>
          <h3 className={styles.dangerTitle}>Danger zone</h3>

          {dangerMsg && (
            <div className={`${styles.msg} ${dangerMsg.error ? styles.msgError : styles.msgSuccess}`}>
              {dangerMsg.text}
            </div>
          )}

          {!deleteAccountOpen ? (
            <button
              className={styles.dangerBtn}
              onClick={() => setDeleteAccountOpen(true)}
            >
              Delete account
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteConfirmText}>
                Type <strong>delete</strong> to confirm. This will permanently
                delete your account, all decks, and all cards.
              </p>
              <input
                type="text"
                className={styles.input}
                placeholder="delete"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              <div className={styles.deleteConfirmActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => { setDeleteAccountOpen(false); setDeleteConfirmText(""); }}
                >
                  Cancel
                </button>
                <button
                  className={styles.dangerBtnStrong}
                  onClick={() => void handleDeleteAccount()}
                  disabled={deletingAccount || deleteConfirmText !== "delete"}
                >
                  {deletingAccount ? "Deleting…" : "Delete my account"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

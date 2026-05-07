import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.tsx";
import styles from "./Login.module.css";

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      void navigate("/", { replace: true });
    } else {
      void navigate("/login?error=failed", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p style={{ marginTop: 16, color: "#8B859E", fontSize: 14 }}>
        Signing you in…
      </p>
    </div>
  );
}

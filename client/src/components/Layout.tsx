import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.tsx";
import { apiFetch } from "../lib/api.ts";
import AccountModal from "./AccountModal.tsx";
import styles from "./Layout.module.css";

interface StreakDay { date: string; count: number; }

function calcCurrentStreak(data: StreakDay[]): number {
  const activeSet = new Set(data.filter((d) => d.count > 0).map((d) => d.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (activeSet.has(s)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function calcLongestStreak(data: StreakDay[]): number {
  let longest = 0, cur = 0;
  for (const d of data) {
    if (d.count > 0) { cur++; if (cur > longest) longest = cur; }
    else cur = 0;
  }
  return longest;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/decks") return "My Decks";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/import") return "Import with AI";
  if (/^\/decks\/\d+\/study/.test(pathname)) return "Study Session";
  if (/^\/decks\/\d+\/import/.test(pathname)) return "Import with AI";
  if (/^\/decks\/\d+/.test(pathname)) return "Deck";
  return "memo";
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconDecks() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
      <path d="M3 9a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      <path d="M3 14a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
      <path d="M16 14l.75 2.25L19 17l-2.25.75L16 20l-.75-2.25L13 17l2.25-.75L16 14z" opacity="0.6" />
    </svg>
  );
}


function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-1.023a.75.75 0 111.044-1.079l2.5 2.437a.75.75 0 010 1.079l-2.5 2.438a.75.75 0 01-1.044-1.08l1.048-1.022H6.75A.75.75 0 016 10z" clipRule="evenodd" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

const navItems = [
  { to: "/",        label: "Dashboard",      icon: <IconDashboard />, end: true  },
  { to: "/decks",   label: "My Decks",       icon: <IconDecks />,     end: false },
  { to: "/import",  label: "Import with AI", icon: <IconSparkle />,   end: false },
];

function StreakWidget({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [streakData, setStreakData] = useState<StreakDay[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => {
    apiFetch<StreakDay[]>(`/api/reviews/streak?userId=${userId}`)
      .then((data) => setStreakData(data))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentStreak = calcCurrentStreak(streakData);
  const longestStreak = calcLongestStreak(streakData);
  const activeDays = streakData.filter((d) => d.count > 0).length;
  const activeSet = new Set(streakData.filter((d) => d.count > 0).map((d) => d.date));
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const handleShare = () => {
    const W = 480;
    const H = 600;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FFF8F2";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(249, 115, 22, 0.15)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    const drawStar = (x: number, y: number, size: number, alpha: number) => {
      ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✦", x, y);
    };
    drawStar(46, 56, 22, 0.9);
    drawStar(W - 46, 72, 15, 0.7);
    drawStar(64, 140, 11, 0.45);
    drawStar(W - 68, 148, 9, 0.35);
    drawStar(W / 2 - 110, 86, 10, 0.3);
    drawStar(W / 2 + 100, 68, 8, 0.25);
    drawStar(52, H - 68, 13, 0.4);
    drawStar(W - 52, H - 80, 10, 0.3);

    ctx.save();
    ctx.strokeStyle = "rgba(249, 115, 22, 0.22)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let x = 90; x <= W - 90; x++) {
      const y = 108 + Math.sin(((x - 90) / 22) * Math.PI * 2) * 5;
      if (x === 90) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.font = "68px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥", W / 2, 198);

    const numStr = String(currentStreak);
    ctx.fillStyle = "#141414";
    ctx.font = `bold ${numStr.length > 2 ? 96 : 124}px -apple-system, 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(numStr, W / 2, 315);

    ctx.fillStyle = "#F97316";
    ctx.font = `bold 21px -apple-system, 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(`I've reached ${currentStreak} day${currentStreak !== 1 ? "s" : ""}`, W / 2, 398);

    ctx.fillStyle = "#555555";
    ctx.font = `19px -apple-system, 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("learning streak", W / 2, 425);

    ctx.strokeStyle = "#E5DDD5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(64, 452);
    ctx.lineTo(W - 64, 452);
    ctx.stroke();

    ctx.fillStyle = "#888888";
    ctx.font = `13px -apple-system, 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(`${activeDays} active days · ${MONTH_NAMES[calMonth]} ${calYear}`, W / 2, 474);

    ctx.save();
    ctx.strokeStyle = "rgba(249, 115, 22, 0.18)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let x = 90; x <= W - 90; x++) {
      const y = 506 + Math.sin(((x - 90) / 22) * Math.PI * 2) * 5;
      if (x === 90) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#3A6B4A";
    ctx.font = `bold 30px -apple-system, 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("memo.", W / 2, 552);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "memo-streak.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className={styles.streakWidget} ref={ref}>
      <button
        className={styles.streakBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="View activity streak"
      >
        🔥 {currentStreak}
      </button>

      {open && (
        <div className={styles.streakDropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Activity</span>
            <button
              className={styles.shareBtn}
              title="Download streak image"
              aria-label="Download streak image"
              onClick={handleShare}
            >
              <IconShare />
            </button>
          </div>

          <div className={styles.statBoxes}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>🔥 {currentStreak}</div>
              <div className={styles.statLabel}>Day streak</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>🏆 {longestStreak}</div>
              <div className={styles.statLabel}>Longest streak</div>
            </div>
          </div>

          <div className={styles.activeDaysRow}>
            <span className={styles.activeDaysCheck}>✓</span>
            <span className={styles.activeDaysText}>{activeDays} Active days</span>
          </div>

          <div className={styles.calendarNav}>
            <button className={styles.calNavBtn} onClick={prevMonth} aria-label="Previous month">‹</button>
            <span className={styles.calMonthLabel}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button className={styles.calNavBtn} onClick={nextMonth} aria-label="Next month">›</button>
          </div>

          <div className={styles.calGrid}>
            {DAY_LABELS.map((l) => (
              <div key={l} className={styles.calDayLabel}>{l}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isActive = activeSet.has(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={day}
                  className={[
                    styles.calDay,
                    isActive ? styles.calDayActive : "",
                    isToday ? styles.calDayToday : "",
                  ].filter(Boolean).join(" ")}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileWidgetProps {
  user: { name: string; email: string; avatar: string | null };
  logout: () => Promise<void>;
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenAccount: () => void;
}

function ProfileWidget({ user, logout, darkMode, onToggleDark, onOpenAccount }: ProfileWidgetProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user.name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={styles.profileWidget} ref={ref}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Profile menu"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className={styles.avatarImg} referrerPolicy="no-referrer" />
        ) : (
          <div className={styles.avatar}>{initials}</div>
        )}
      </button>

      {open && (
        <div className={styles.profileDropdown}>
          <div className={styles.profileHeader}>
            <div className={styles.profileName}>{user.name}</div>
            <div className={styles.profileEmail}>{user.email}</div>
          </div>

          <div className={styles.dropdownDivider} />

          <button
            className={styles.dropdownItem}
            onClick={() => { setOpen(false); onOpenAccount(); }}
          >
            <IconAccount />
            Account
          </button>

          <div className={styles.dropdownItemAppearance}>
            <span className={styles.appearanceLeft}>
              <IconMoon />
              Appearance
            </span>
            <button
              className={`${styles.toggleBtn} ${darkMode ? styles.toggleBtnOn : ""}`}
              onClick={onToggleDark}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          <div className={styles.dropdownDivider} />

          <button
            className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
            onClick={() => { setOpen(false); void logout(); }}
          >
            <IconLogout />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("memo-theme") === "dark";
  });

  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("memo-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!loading && !user) {
      void navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className={styles.authLoading}>
        <div className={styles.authSpinner} />
      </div>
    );
  }

  if (!user) return null;

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          memo<span className={styles.logoDot}>.</span>
        </div>
        <ul className={styles.nav}>
          {navItems.map(({ to, label, icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ""}`
                }
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.mainArea}>
        <div className={styles.topbar}>
          <h1 className={styles.topbarTitle}>{pageTitle}</h1>
          <div className={styles.topbarRight}>
            <StreakWidget userId={user.id} />
            <ProfileWidget
              user={user}
              logout={logout}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
              onOpenAccount={() => setShowAccountModal(true)}
            />
          </div>
        </div>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <AccountModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  );
}

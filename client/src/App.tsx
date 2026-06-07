import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import type { Lang } from "@/lib/i18n";

import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import WorkoutPage from "@/pages/workout";
import ActiveWorkoutPage from "@/pages/active-workout";
import CalendarPage from "@/pages/calendar";
import FriendsPage from "@/pages/friends";
import ProfilePage from "@/pages/profile";
import ExercisesPage from "@/pages/exercises";
import ProgressPage from "@/pages/progress";
import TemplatesPage from "@/pages/templates";
import WorkoutDetailPage from "@/pages/workout-detail";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/not-found";

// ─── Auth Context ──────────────────────────────────────────────────────────
type AuthContextType = {
  userId: number | null;
  user: any;
  login: (userId: number, user: any) => void;
  logout: () => void;
  authLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  userId: null, user: null, login: () => {}, logout: () => {}, authLoading: true,
});
export const useAuth = () => useContext(AuthContext);

// Inactivity timeout: 30 days in ms
const INACTIVITY_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Theme Context ─────────────────────────────────────────────────────────
type ThemeContextType = { isDark: boolean; toggle: () => void };
export const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ─── Lang Context ──────────────────────────────────────────────────────────
type LangContextType = { lang: Lang; setLang: (l: Lang) => void };
export const LangContext = createContext<LangContextType>({ lang: "ru", setLang: () => {} });
export const useLang = () => useContext(LangContext);

function AppRoutes() {
  const { userId, authLoading } = useAuth();
  const [location] = useLocation();
  const isActiveWorkout = location.startsWith("/workout/active");

  // Show login page immediately; overlay spinner while session is being checked
  if (!userId) {
    return (
      <>
        <LoginPage />
        {authLoading && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={isActiveWorkout ? "" : "pb-nav"}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/workout" component={WorkoutPage} />
          <Route path="/workout/active/:id" component={ActiveWorkoutPage} />
          <Route path="/workout/:id" component={WorkoutDetailPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/exercises" component={ExercisesPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/templates" component={TemplatesPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      {!isActiveWorkout && <BottomNav />}
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Lang>("ru");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
  }, [isDark]);

  // Restore session from cookie on app start
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    fetch("/api/auth/session", { credentials: "include", signal: controller.signal })
      .then(async r => {
        if (r.ok) {
          const data = await r.json();
          if (data?.user) {
            setUserId(data.user.id);
            setUser(data.user);
          }
        }
      })
      .catch(() => {}) // 401, abort, network error — all treated as "no session"
      .finally(() => {
        clearTimeout(timeout);
        setAuthLoading(false);
      });

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  // Inactivity auto-logout after 30 days
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [userId]);

  const login = (id: number, u: any) => {
    console.log("[Auth] login called, userId:", id, "user:", u);
    setUserId(id);
    setUser(u);
  };
  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUserId(null);
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LangContext.Provider value={{ lang, setLang }}>
        <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(v => !v) }}>
          <AuthContext.Provider value={{ userId, user, login, logout, authLoading }}>
            <Router hook={useHashLocation}>
              <AppRoutes />
            </Router>
            <Toaster />
          </AuthContext.Provider>
        </ThemeContext.Provider>
      </LangContext.Provider>
    </QueryClientProvider>
  );
}

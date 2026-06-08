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
import FriendProfilePage from "@/pages/friend-profile";
import FriendWorkoutDetailPage from "@/pages/friend-workout-detail";
import AdminPage from "@/pages/admin";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/not-found";

// ─── Auth Context ──────────────────────────────────────────────────────────
type AuthContextType = {
  userId: number | null;
  user: any;
  login: (user: any) => void;
  logout: () => void;
  authLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  userId: null, user: null, login: () => {}, logout: () => {}, authLoading: true,
});
export const useAuth = () => useContext(AuthContext);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userId) return <LoginPage />;

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
          <Route path="/friends/:id/workout/:workoutId" component={FriendWorkoutDetailPage} />
          <Route path="/friends/:id" component={FriendProfilePage} />
          <Route path="/admin" component={AdminPage} />
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
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Lang>("ru");

  // Restore session on page load
  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDark]);

  const login = (u: any) => setUser(u);
  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => {
        setUser(null);
        queryClient.clear();
      });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LangContext.Provider value={{ lang, setLang }}>
        <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(v => !v) }}>
          <AuthContext.Provider value={{ userId: user?.id ?? null, user, login, logout, authLoading }}>
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

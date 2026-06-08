import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dumbbell, TrendingUp, Trophy, Calendar, ChevronRight, Plus, Clock, Flame, Sun, Moon } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth, useTheme, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";

export default function HomePage() {
  const { userId, user } = useAuth();
  const { isDark, toggle } = useTheme();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users", userId, "stats"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/stats`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ["/api/workouts", userId],
    queryFn: () => apiRequest("GET", `/api/workouts/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: prsData } = useQuery({
    queryKey: ["/api/prs", userId],
    queryFn: () => apiRequest("GET", `/api/prs/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const recentWorkouts = workouts?.slice(0, 3) ?? [];
  const recentPRs = prsData?.slice(0, 3) ?? [];

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return t("home.greetMorning", lang);
    if (h < 17) return t("home.greetAfternoon", lang);
    return t("home.greetEvening", lang);
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">{greeting()},</p>
          <h1 className="text-xl font-bold">{user?.name ?? "Athlete"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="button-theme-toggle"
            onClick={toggle}
            className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <Link href="/workout">
        <button
          data-testid="button-start-workout"
          className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 mb-5 hover-elevate active-elevate"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
            <Plus size={24} className="text-primary-foreground" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-base">{t("home.startWorkout", lang)}</div>
            <div className="text-primary-foreground/70 text-sm">{t("home.startSub", lang)}</div>
          </div>
          <ChevronRight className="ml-auto" size={18} opacity={0.7} />
        </button>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: t("home.workouts", lang),  value: statsData?.totalWorkouts ?? 0,  color: "text-primary" },
          { label: t("home.records", lang),   value: statsData?.totalPRs ?? 0,       color: "text-chart-4" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-card-border rounded-2xl p-3 text-center">
            {statsLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            )}
            <div className="text-muted-foreground text-xs mt-0.5 leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Workouts */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">{t("home.recentWorkouts", lang)}</h2>
          <Link href="/workout">
            <span className="text-primary text-sm font-medium">{t("home.seeAll", lang)}</span>
          </Link>
        </div>
        {workoutsLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : recentWorkouts.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-5 text-center">
            <Dumbbell size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("home.noWorkouts", lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w: any) => (
              <div key={w.id} data-testid={`workout-card-${w.id}`}
                onClick={() => navigate(`/workout/${w.id}`)}
                className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover-elevate active-elevate">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{w.title}</div>
                  <div className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                    <Calendar size={10} />
                    {format(parseISO(w.date + "T00:00:00"), "d MMM", { locale })}
                    {w.durationMinutes && (
                      <><span className="mx-1">·</span><Clock size={10} />{w.durationMinutes}m</>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">{t("home.recentPRs", lang)}</h2>
            <Link href="/progress">
              <span className="text-primary text-sm font-medium">{t("home.seeAll", lang)}</span>
            </Link>
          </div>
          <div className="space-y-2">
            {recentPRs.map((pr: any) => (
              <div key={pr.id} data-testid={`pr-card-${pr.id}`}
                className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{pr.exercise?.name ?? "Exercise"}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{pr.weight}кг × {pr.reps}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(pr.date + "T00:00:00"), "d MMM", { locale })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/exercises">
          <button className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-2 w-full hover-elevate text-left">
            <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <Dumbbell size={16} className="text-chart-2" />
            </div>
            <span className="text-sm font-medium">{t("home.exercises", lang)}</span>
          </button>
        </Link>
        <Link href="/progress">
          <button className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-2 w-full hover-elevate text-left">
            <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-chart-3" />
            </div>
            <span className="text-sm font-medium">{t("home.progress", lang)}</span>
          </button>
        </Link>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, LogOut, Trophy, Dumbbell, Flame, Sun, Moon, Globe } from "lucide-react";
import { useAuth, useTheme, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";

export default function ProfilePage() {
  const { userId, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [showNotifs, setShowNotifs] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users", userId, "stats"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/stats`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["/api/notifications", userId],
    queryFn: () => apiRequest("GET", `/api/notifications/${userId}`).then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", `/api/notifications/mark-all-read/${userId}`, {}).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] }),
  });

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const notifIcon = (type: string) => {
    if (type === "pr_achieved") return "🏆";
    if (type === "event_invite") return "📅";
    if (type === "event_reminder") return "⏰";
    if (type === "friend_request") return "👋";
    return "🔔";
  };

  const notifTitle = (n: any) => {
    const payload = JSON.parse(n.payload ?? "{}");
    if (n.type === "pr_achieved") {
      return lang === "ru"
        ? `Новый рекорд: ${payload.exerciseName ?? "упражнение"} ${payload.weight}кг × ${payload.reps}`
        : `New PR: ${payload.exerciseName ?? "exercise"} ${payload.weight}kg × ${payload.reps}`;
    }
    if (n.type === "event_invite") {
      return lang === "ru"
        ? `Приглашение: ${payload.eventTitle ?? "событие"}`
        : `Invited to: ${payload.eventTitle ?? "event"}`;
    }
    if (n.type === "friend_request") {
      return lang === "ru"
        ? `${payload.fromUserName ?? "Пользователь"} отправил заявку в друзья`
        : `${payload.fromUserName ?? "Someone"} sent a friend request`;
    }
    if (n.type === "event_reminder") {
      return lang === "ru"
        ? `Напоминание: ${payload.eventTitle ?? "событие"}`
        : `Reminder: ${payload.eventTitle ?? "event"}`;
    }
    return lang === "ru" ? "Уведомление" : "Notification";
  };

  const goalLabel = (goal?: string) =>
    t(`profile.goals.${goal ?? "general"}` as any, lang) ?? (lang === "ru" ? "Общий фитнес" : "General Fitness");

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t("profile.title", lang)}</h1>
        <button data-testid="button-notifications" onClick={() => setShowNotifs(true)}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center relative">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Avatar + Info */}
      <div className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{user?.name ?? "Athlete"}</div>
          <div className="text-muted-foreground text-sm">@{user?.username}</div>
          <div className="mt-1">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {goalLabel(user?.goal)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: Dumbbell, label: t("profile.workouts", lang), value: stats?.totalWorkouts, color: "text-primary" },
          { icon: Flame,    label: t("profile.volume", lang),   value: stats?.totalVolume?.toLocaleString(), color: "text-chart-2" },
          { icon: Trophy,   label: t("profile.prs", lang),      value: stats?.totalPRs, color: "text-yellow-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-card-border rounded-2xl p-3 text-center">
            {statsLoading ? <Skeleton className="h-6 w-10 mx-auto mb-1" /> : (
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value ?? 0}</div>
            )}
            <div className="text-muted-foreground text-xs leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        {/* Theme toggle */}
        <button data-testid="button-toggle-theme" onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left">
          {isDark ? <Moon size={18} className="text-muted-foreground" /> : <Sun size={18} className="text-muted-foreground" />}
          <span className="font-medium text-sm flex-1">
            {isDark ? t("profile.darkMode", lang) : t("profile.lightMode", lang)}
          </span>
          <span className="text-xs text-muted-foreground">{t("profile.switchTheme", lang)}</span>
        </button>

        {/* Language toggle */}
        <button data-testid="button-toggle-lang"
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left">
          <Globe size={18} className="text-muted-foreground" />
          <span className="font-medium text-sm flex-1">{t("profile.language", lang)}</span>
          <span className="text-xs font-semibold text-primary">{lang === "ru" ? "RU → EN" : "EN → RU"}</span>
        </button>

        {/* Logout */}
        <button data-testid="button-logout" onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate text-left text-destructive">
          <LogOut size={18} />
          <span className="font-medium text-sm">{t("profile.logout", lang)}</span>
        </button>
      </div>

      {/* Notifications Panel */}
      <Dialog open={showNotifs} onOpenChange={setShowNotifs}>
        <DialogContent className="bg-card border-card-border max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell size={16} /> {t("profile.notifsTitle", lang)}
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </DialogTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => markAllRead.mutate()}>
                  {t("profile.markAllRead", lang)}
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t("profile.noNotifs", lang)}</div>
            ) : (
              notifications.map((n: any) => (
                <button key={n.id} data-testid={`notif-${n.id}`} onClick={() => markRead.mutate(n.id)}
                  className={`w-full text-left rounded-xl p-3 flex items-start gap-3 transition-colors ${n.isRead ? "opacity-60" : "bg-background border border-border"}`}>
                  <span className="text-xl flex-shrink-0">{notifIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{notifTitle(n)}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {format(parseISO(n.createdAt), "d MMM, HH:mm", { locale })}
                    </div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

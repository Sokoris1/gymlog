import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, LogOut, Trophy, Dumbbell, Flame, Sun, Moon, Globe, KeyRound, AtSign, Trash2, Eye, EyeOff, ChevronRight, Shield, FileDown } from "lucide-react";
import { useAuth, useTheme, useLang } from "@/App";
import { useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { exportWorkoutsPdf } from "@/lib/exportPdf";

export default function ProfilePage() {
  const { userId, user, login, logout } = useAuth();
  const [, navigate] = useLocation();
  const { isDark, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const { toast } = useToast();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Change username state
  const [newUsername, setNewUsername] = useState("");

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");

  const ru = lang === "ru";

  const changePassword = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/change-password", { userId, currentPassword, newPassword }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        setShowChangePassword(false);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        toast({ title: ru ? "Пароль изменён" : "Password changed" });
      } else if (data.error === "wrong_password") {
        toast({ title: ru ? "Неверный текущий пароль" : "Wrong current password", variant: "destructive" });
      } else {
        toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" });
      }
    },
  });

  const changeUsername = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/change-username", { userId, newUsername: newUsername.trim() }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.user) {
        login(data.user.id, data.user);
        setShowChangeUsername(false);
        setNewUsername("");
        toast({ title: ru ? "Никнейм изменён" : "Username updated" });
      } else if (data.error === "username_taken") {
        toast({ title: ru ? "Этот никнейм уже занят" : "Username already taken", variant: "destructive" });
      } else {
        toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" });
      }
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/auth/account/${userId}`, { password: deletePassword }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        logout();
      } else if (data.error === "wrong_password") {
        toast({ title: ru ? "Неверный пароль" : "Wrong password", variant: "destructive" });
      } else {
        toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" });
      }
    },
  });

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

  const handleExportPdf = async () => {
    if (!userId || !user) return;
    setExportLoading(true);
    try {
      await exportWorkoutsPdf(userId, user.username ?? user.name ?? "user", lang, apiRequest);
      toast({ title: ru ? "PDF сохранён" : "PDF saved" });
    } catch (e) {
      console.error(e);
      toast({ title: ru ? "Ошибка при экспорте" : "Export failed", variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

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

        {/* Change username */}
        <button onClick={() => { setNewUsername(user?.username ?? ""); setShowChangeUsername(true); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left">
          <AtSign size={18} className="text-muted-foreground" />
          <span className="font-medium text-sm flex-1">{ru ? "Изменить никнейм" : "Change username"}</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>

        {/* Change password */}
        <button onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left">
          <KeyRound size={18} className="text-muted-foreground" />
          <span className="font-medium text-sm flex-1">{ru ? "Изменить пароль" : "Change password"}</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>

        {/* Export PDF */}
        <button
          onClick={handleExportPdf}
          disabled={exportLoading}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left disabled:opacity-50">
          <FileDown size={18} className="text-muted-foreground" />
          <span className="font-medium text-sm flex-1">
            {exportLoading
              ? (ru ? "Генерация PDF..." : "Generating PDF...")
              : (ru ? "Экспорт в PDF" : "Export to PDF")}
          </span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>

        {/* Admin panel */}
        {user?.isAdmin && (
          <button onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left text-primary">
            <Shield size={18} />
            <span className="font-medium text-sm">{ru ? "Панель администратора" : "Admin Panel"}</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </button>
        )}

        {/* Logout */}
        <button data-testid="button-logout" onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate border-b border-card-border text-left text-destructive">
          <LogOut size={18} />
          <span className="font-medium text-sm">{t("profile.logout", lang)}</span>
        </button>

        {/* Delete account */}
        <button onClick={() => { setDeletePassword(""); setShowDeleteAccount(true); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover-elevate text-left text-destructive">
          <Trash2 size={18} />
          <span className="font-medium text-sm">{ru ? "Удалить аккаунт" : "Delete account"}</span>
        </button>
      </div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={showChangePassword} onOpenChange={v => { setShowChangePassword(v); if (!v) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{ru ? "Изменение пароля" : "Change password"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Input type={showPw ? "text" : "password"} placeholder={ru ? "Текущий пароль" : "Current password"}
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="bg-background border-border pr-11" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input type={showPw ? "text" : "password"} placeholder={ru ? "Новый пароль" : "New password"}
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="bg-background border-border" />
            <Input type={showPw ? "text" : "password"} placeholder={ru ? "Повторите новый пароль" : "Confirm new password"}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="bg-background border-border" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowChangePassword(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button className="flex-1"
                disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                onClick={() => {
                  if (newPassword.length < 6) { toast({ title: ru ? "Пароль минимум 6 символов" : "Min 6 characters", variant: "destructive" }); return; }
                  changePassword.mutate();
                }}>
                {changePassword.isPending ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Username Dialog ── */}
      <Dialog open={showChangeUsername} onOpenChange={setShowChangeUsername}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{ru ? "Изменение никнейма" : "Change username"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <Input placeholder={ru ? "Новый никнейм" : "New username"}
              value={newUsername} onChange={e => setNewUsername(e.target.value)}
              className="bg-background border-border" autoCapitalize="none" autoCorrect="off" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowChangeUsername(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button className="flex-1"
                disabled={changeUsername.isPending || !newUsername.trim() || newUsername.trim() === user?.username}
                onClick={() => changeUsername.mutate()}>
                {changeUsername.isPending ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ── */}
      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle className="text-destructive">{ru ? "Удалить аккаунт" : "Delete account"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              {ru
                ? "Все ваши данные будут удалены безвозвратно: тренировки, рекорды, профиль."
                : "All your data will be permanently deleted: workouts, PRs, profile."}
            </p>
            <Input type="password" placeholder={ru ? "Подтвердите пароль" : "Confirm your password"}
              value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              className="bg-background border-border" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteAccount(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button variant="destructive" className="flex-1"
                disabled={deleteAccount.isPending || !deletePassword}
                onClick={() => deleteAccount.mutate()}>
                {deleteAccount.isPending ? (ru ? "Удаление..." : "Deleting...") : (ru ? "Удалить" : "Delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

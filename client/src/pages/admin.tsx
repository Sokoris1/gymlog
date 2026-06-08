import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, Shield, Users } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { userId, user } = useAuth();
  const { lang } = useLang();
  const ru = lang === "ru";
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users", userId],
    queryFn: () => apiRequest("GET", `/api/admin/users?adminId=${userId}`).then(r => r.json()),
    enabled: !!userId && !!user?.isAdmin,
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}?adminId=${userId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      setDeleteConfirmId(null);
      toast({ title: ru ? "Пользователь удалён" : "User deleted" });
    },
    onError: () => toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" }),
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Shield size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{ru ? "Нет доступа" : "Access denied"}</p>
          <Button className="mt-4" onClick={() => navigate("/")}>{ru ? "На главную" : "Home"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ru ? "Администрирование" : "Admin Panel"}</h1>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-medium">
          <Shield size={12} /> Admin
        </div>
      </div>

      {/* Stats */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-primary" />
          <span className="font-semibold text-sm">{ru ? "Пользователи" : "Users"}</span>
        </div>
        <div className="text-3xl font-bold text-primary">{users?.length ?? "—"}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{ru ? "всего аккаунтов" : "total accounts"}</div>
      </div>

      {/* User list */}
      <h2 className="font-semibold text-sm mb-3 text-muted-foreground">{ru ? "Все пользователи" : "All users"}</h2>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u: any) => (
            <div key={u.id} className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.isAdmin ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {u.isAdmin ? <Shield size={16} /> : u.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-1.5">
                  {u.name}
                  {u.isAdmin && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">admin</span>}
                </div>
                <div className="text-muted-foreground text-xs">
                  @{u.username}
                  {u.createdAt && ` · ${format(new Date(u.createdAt), "d MMM yyyy", { locale })}`}
                </div>
              </div>
              {!u.isAdmin && (
                <button
                  onClick={() => { setDeleteConfirmId(u.id); setDeleteConfirmName(u.name); }}
                  className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-1">{ru ? "Удалить пользователя?" : "Delete user?"}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {ru ? `Аккаунт «${deleteConfirmName}» и все его данные будут удалены безвозвратно.` : `Account "${deleteConfirmName}" and all its data will be permanently deleted.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button variant="destructive" className="flex-1" disabled={deleteUser.isPending}
                onClick={() => deleteUser.mutate(deleteConfirmId!)}>
                {deleteUser.isPending ? (ru ? "Удаление..." : "Deleting...") : (ru ? "Удалить" : "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus, Check, X, Users, ChevronRight } from "lucide-react";
import { useAuth } from "@/App";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function FriendsPage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [, navigate] = useLocation();

  // My outgoing friendships
  const { data: friends, isLoading } = useQuery({
    queryKey: ["/api/users", userId, "friends"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/friends`).then(r => r.json()),
    enabled: !!userId,
  });

  // Incoming requests from others
  const { data: incoming, isLoading: incomingLoading } = useQuery({
    queryKey: ["/api/users", userId, "friend-requests"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/friend-requests`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("GET", "/api/users").then(r => r.json()),
  });

  const sendRequest = useMutation({
    mutationFn: (friendId: number) =>
      apiRequest("POST", "/api/friends/request", { userId, friendId }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "friends"] });
      toast({ title: "Заявка отправлена" });
      setShowAddFriend(false);
    },
    onError: () => toast({ title: "Уже отправлено или ошибка", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/friends/${id}/status`, { status }).then(r => r.json()),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      toast({ title: vars.status === "accepted" ? "Заявка принята" : "Заявка отклонена" });
    },
  });

  const accepted = friends?.filter((f: any) => f.status === "accepted") ?? [];
  const pendingOutgoing = friends?.filter((f: any) => f.status === "pending") ?? [];
  const pendingIncoming = incoming?.filter((f: any) => f.status === "pending") ?? [];

  // Users who are not already friends, haven't been sent a request
  const existingFriendIds = new Set([
    ...(friends?.map((f: any) => f.friendId) ?? []),
    ...(incoming?.map((f: any) => f.userId) ?? []),
    userId,
  ]);
  const availableUsers = allUsers?.filter((u: any) => !existingFriendIds.has(u.id)) ?? [];

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Друзья</h1>
        <Button
          data-testid="button-add-friend"
          size="sm"
          className="rounded-xl gap-1"
          onClick={() => setShowAddFriend(true)}
        >
          <UserPlus size={16} /> Добавить
        </Button>
      </div>

      {/* ─── Incoming requests ────────────────────────────────────────── */}
      {(incomingLoading || pendingIncoming.length > 0) && (
        <div className="mb-5">
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-2">
            Входящие заявки
            {pendingIncoming.length > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pendingIncoming.length}
              </span>
            )}
          </h2>
          {incomingLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : (
            <div className="space-y-2">
              {pendingIncoming.map((req: any) => (
                <div
                  key={req.id}
                  data-testid={`incoming-request-${req.id}`}
                  className="bg-card border border-primary/30 rounded-2xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                    {req.senderData?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{req.senderData?.name ?? "Пользователь"}</div>
                    <div className="text-muted-foreground text-xs">@{req.senderData?.username}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      data-testid={`button-accept-${req.id}`}
                      onClick={() => updateStatus.mutate({ id: req.id, status: "accepted" })}
                      disabled={updateStatus.isPending}
                      className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      data-testid={`button-decline-${req.id}`}
                      onClick={() => updateStatus.mutate({ id: req.id, status: "declined" })}
                      disabled={updateStatus.isPending}
                      className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Outgoing pending ─────────────────────────────────────────── */}
      {pendingOutgoing.length > 0 && (
        <div className="mb-5">
          <h2 className="font-semibold text-sm text-muted-foreground mb-2">Отправленные заявки</h2>
          <div className="space-y-2">
            {pendingOutgoing.map((f: any) => (
              <div key={f.id} data-testid={`pending-outgoing-${f.id}`} className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm">
                  {f.friendData?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{f.friendData?.name ?? "Пользователь"}</div>
                  <div className="text-muted-foreground text-xs">@{f.friendData?.username}</div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg flex-shrink-0">Ожидает</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Friends list ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <h2 className="font-semibold text-sm text-muted-foreground mb-2">
          {accepted.length} {pluralFriends(accepted.length)}
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : accepted.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <Users size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Нет друзей пока что.</p>
            <p className="text-muted-foreground text-xs mt-1">Добавьте кого-нибудь, чтобы делиться прогрессом!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((f: any) => (
              <button key={f.id} data-testid={`friend-card-${f.id}`}
                onClick={() => navigate(`/friends/${f.friendId}`)}
                className="w-full bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 hover-elevate text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                  {f.friendData?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{f.friendData?.name ?? "Пользователь"}</div>
                  <div className="text-muted-foreground text-xs">@{f.friendData?.username}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-lg">{goalLabel(f.friendData?.goal)}</span>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add Friend Dialog ────────────────────────────────────────── */}
      <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
        <DialogContent className="bg-card border-card-border max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Добавить друга</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 mt-2 pr-1">
            {availableUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Нет доступных пользователей</p>
            ) : (
              availableUsers.map((u: any) => (
                <div key={u.id} data-testid={`available-user-${u.id}`} className="flex items-center gap-3 bg-background border border-border rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-muted-foreground text-xs">@{u.username}</div>
                  </div>
                  <Button
                    data-testid={`button-send-request-${u.id}`}
                    size="sm"
                    variant="outline"
                    className="rounded-lg border-border flex-shrink-0"
                    onClick={() => sendRequest.mutate(u.id)}
                    disabled={sendRequest.isPending}
                  >
                    <UserPlus size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function pluralFriends(n: number) {
  if (n === 1) return "друг";
  if (n >= 2 && n <= 4) return "друга";
  return "друзей";
}

function goalLabel(goal?: string) {
  const labels: Record<string, string> = {
    strength: "Сила", hypertrophy: "Масса",
    weight_loss: "Похудение", general: "Общий",
  };
  return labels[goal ?? "general"] ?? "Общий";
}

import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Trophy, Dumbbell, Calendar, Star, ChevronRight } from "lucide-react";
import { useLang } from "@/App";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { exerciseNameRu } from "@/lib/exerciseNames";
import { useState } from "react";

const muscleGroupColors: Record<string, string> = {
  chest: "text-red-400", back: "text-blue-400", legs: "text-green-400",
  shoulders: "text-yellow-400", arms: "text-purple-400", core: "text-orange-400",
};

function exName(ex: any, lang: string) {
  return lang === "ru" ? (exerciseNameRu[ex?.name ?? ""] ?? ex?.name ?? "—") : (ex?.name ?? "—");
}

function goalLabel(goal?: string, ru?: boolean) {
  const labels: Record<string, [string, string]> = {
    strength: ["Сила", "Strength"], hypertrophy: ["Масса", "Hypertrophy"],
    weight_loss: ["Похудение", "Weight loss"], general: ["Общий", "General"],
  };
  const pair = labels[goal ?? "general"] ?? labels["general"];
  return ru ? pair[0] : pair[1];
}

export default function FriendProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const ru = lang === "ru";
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"workouts" | "records">("workouts");

  const friendId = Number(id);

  const { data: friend, isLoading: friendLoading } = useQuery({
    queryKey: ["/api/users", friendId],
    queryFn: () => apiRequest("GET", `/api/users/${friendId}`).then(r => r.json()),
    enabled: !!friendId,
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ["/api/users", friendId, "workouts"],
    queryFn: () => apiRequest("GET", `/api/users/${friendId}/workouts`).then(r => r.json()),
    enabled: !!friendId,
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/prs", friendId],
    queryFn: () => apiRequest("GET", `/api/prs/${friendId}`).then(r => r.json()),
    enabled: !!friendId,
  });

  if (friendLoading) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const recentWorkouts = (workouts ?? [])
    .slice()
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/friends")}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">{friend?.name ?? `@${id}`}</h1>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {friend?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate">{friend?.name}</div>
            <div className="text-muted-foreground text-sm">@{friend?.username}</div>
            <div className="mt-1">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                {goalLabel(friend?.goal, ru)}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary">{(workouts ?? []).length}</div>
            <div className="text-xs text-muted-foreground">{ru ? "тренировок" : "workouts"}</div>
          </div>
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">{(records ?? []).length}</div>
            <div className="text-xs text-muted-foreground">{ru ? "рекордов" : "records"}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("workouts")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "workouts" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          {ru ? "Тренировки" : "Workouts"}
        </button>
        <button
          onClick={() => setTab("records")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "records" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          {ru ? "Рекорды" : "Records"}
        </button>
      </div>

      {/* Workouts tab */}
      {tab === "workouts" && (
        workoutsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : recentWorkouts.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <Dumbbell size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{ru ? "Нет тренировок" : "No workouts yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w: any) => (
              <button
                key={w.id}
                className="w-full bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 text-left hover:bg-card/80 active:scale-[0.99] transition-all"
                onClick={() => navigate(`/friends/${id}/workout/${w.id}`)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{w.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {format(parseISO(w.date + "T00:00:00"), "d MMMM yyyy", { locale })}
                    {w.durationMinutes ? ` · ${w.durationMinutes} ${ru ? "мин" : "min"}` : ""}
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )
      )}

      {/* Records tab */}
      {tab === "records" && (
        recordsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (records?.length ?? 0) === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <Trophy size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{ru ? "Нет рекордов" : "No records yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((rec: any) => (
              <div key={rec.id} className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  {rec.reps === 1
                    ? <Star size={18} className="text-yellow-400" />
                    : <Trophy size={18} className="text-yellow-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{exName(rec.exercise, lang)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-primary font-semibold text-sm">{rec.weight} кг × {rec.reps}</span>
                    {rec.reps === 1 && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md font-bold">1RM</span>
                    )}
                    <span className={`text-xs ${muscleGroupColors[rec.exercise?.muscleGroup] ?? "text-muted-foreground"}`}>
                      {rec.exercise?.muscleGroup}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0">
                  {format(parseISO(rec.date + "T00:00:00"), "d MMM", { locale })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

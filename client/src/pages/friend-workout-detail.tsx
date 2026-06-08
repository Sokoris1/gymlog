import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Dumbbell, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/App";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { exerciseNameRu } from "@/lib/exerciseNames";

export default function FriendWorkoutDetailPage() {
  const { id, workoutId } = useParams<{ id: string; workoutId: string }>();
  const { lang } = useLang();
  const ru = lang === "ru";
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();
  const [expandedEx, setExpandedEx] = useState<number | null>(null);

  const { data: friend } = useQuery({
    queryKey: ["/api/users", Number(id)],
    queryFn: () => apiRequest("GET", `/api/users/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const { data: workout, isLoading } = useQuery({
    queryKey: ["/api/workout", workoutId],
    queryFn: () => apiRequest("GET", `/api/workout/${workoutId}`).then(r => r.json()),
    enabled: !!workoutId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen px-4 pt-6 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">{ru ? "Тренировка не найдена" : "Workout not found"}</p>
        <button
          className="mt-4 px-4 py-2 rounded-xl bg-card border border-card-border text-sm"
          onClick={() => navigate(`/friends/${id}`)}
        >
          {ru ? "Назад" : "Back"}
        </button>
      </div>
    );
  }

  const completedSets = workout.exercises?.flatMap((e: any) => e.sets?.filter((s: any) => s.isCompleted) ?? []) ?? [];
  const totalVolume = completedSets.reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);
  const totalSets = completedSets.length;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/friends/${id}`)}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{workout.title}</h1>
          {friend?.name && (
            <p className="text-xs text-muted-foreground truncate">{friend.name}</p>
          )}
        </div>
        {/* Read-only badge */}
        <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground flex-shrink-0">
          {ru ? "просмотр" : "view only"}
        </span>
      </div>

      {/* Meta */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <Calendar size={14} />
          <span>{format(parseISO(workout.date + "T00:00:00"), "EEEE, d MMMM yyyy", { locale })}</span>
        </div>
        {workout.durationMinutes && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <Clock size={14} />
            <span>{workout.durationMinutes} {ru ? "мин" : "min"}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary">{totalSets}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{ru ? "подходов" : "sets"}</div>
          </div>
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-chart-2">{Math.round(totalVolume).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{ru ? "кг объём" : "kg volume"}</div>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <h2 className="font-semibold text-base mb-3">{ru ? "Упражнения" : "Exercises"}</h2>
      <div className="space-y-2">
        {(workout.exercises ?? []).map((we: any) => {
          const name =
            lang === "ru"
              ? (exerciseNameRu[we.exercise?.name ?? ""] ?? we.exercise?.name ?? "—")
              : (we.exercise?.name ?? "—");
          const completed = (we.sets ?? []).filter((s: any) => s.isCompleted);
          const isExpanded = expandedEx === we.id;

          return (
            <div key={we.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
              <button
                className="w-full p-3 flex items-center gap-3 text-left"
                onClick={() => setExpandedEx(isExpanded ? null : we.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {completed.length} {ru ? "подходов" : "sets"}
                    {completed.length > 0 && (
                      <> · {ru ? "макс" : "max"} {Math.max(...completed.map((s: any) => s.weight))} кг</>
                    )}
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
                  : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <div className="bg-background rounded-xl overflow-hidden">
                    <div className="grid grid-cols-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                      <span>#</span>
                      <span>{ru ? "Вес" : "Weight"}</span>
                      <span>{ru ? "Повт" : "Reps"}</span>
                      <span>RPE</span>
                    </div>
                    {(we.sets ?? []).filter((s: any) => s.isCompleted).map((s: any, idx: number) => (
                      <div key={s.id} className="grid grid-cols-4 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{idx + 1}</span>
                        <span className="font-medium">{s.weight} кг</span>
                        <span>{s.reps}</span>
                        <span className="text-muted-foreground">{s.rpe ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(workout.exercises ?? []).length === 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <Dumbbell size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{ru ? "Нет упражнений" : "No exercises"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

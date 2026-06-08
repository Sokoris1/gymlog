import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Dumbbell, Calendar, Clock, Trash2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useState } from "react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { exerciseNameRu } from "@/lib/exerciseNames";
import { setActiveWorkout } from "@/lib/store";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedEx, setExpandedEx] = useState<number | null>(null);

  const { data: workout, isLoading } = useQuery({
    queryKey: ["/api/workout", id],
    queryFn: () => apiRequest("GET", `/api/workout/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const deleteWorkout = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/workout/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      navigate("/workout");
    },
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
        <p className="text-muted-foreground">{lang === "ru" ? "Тренировка не найдена" : "Workout not found"}</p>
        <Button className="mt-4" onClick={() => navigate("/workout")}>{lang === "ru" ? "Назад" : "Back"}</Button>
      </div>
    );
  }

  const completedSets = workout.exercises?.flatMap((e: any) => e.sets?.filter((s: any) => s.isCompleted) ?? []) ?? [];
  const totalVolume = completedSets.reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);
  const totalSets = completedSets.length;

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/workout")}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">{workout.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveWorkout(workout.id);
              navigate(`/workout/active/${workout.id}`);
            }}
            className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
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
            <span>{workout.durationMinutes} {lang === "ru" ? "мин" : "min"}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary">{totalSets}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{lang === "ru" ? "подходов" : "sets"}</div>
          </div>
          <div className="bg-background rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-chart-2">{Math.round(totalVolume).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{lang === "ru" ? "кг объём" : "kg volume"}</div>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <h2 className="font-semibold text-base mb-3">{lang === "ru" ? "Упражнения" : "Exercises"}</h2>
      <div className="space-y-2">
        {(workout.exercises ?? []).map((we: any) => {
          const exName = lang === "ru"
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
                  <div className="font-medium text-sm truncate">{exName}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {completed.length} {lang === "ru" ? "подходов" : "sets"}
                    {completed.length > 0 && (
                      <> · {lang === "ru" ? "макс" : "max"} {Math.max(...completed.map((s: any) => s.weight))} кг</>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <div className="bg-background rounded-xl overflow-hidden">
                    <div className="grid grid-cols-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                      <span>#</span>
                      <span>{lang === "ru" ? "Вес" : "Weight"}</span>
                      <span>{lang === "ru" ? "Повт" : "Reps"}</span>
                      <span>RPE</span>
                    </div>
                    {(we.sets ?? []).map((s: any, idx: number) => (
                      <div key={s.id}
                        className={`grid grid-cols-4 px-3 py-2 text-sm ${!s.isCompleted ? "opacity-40" : ""}`}>
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
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-2">
              {lang === "ru" ? "Удалить тренировку?" : "Delete workout?"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {lang === "ru"
                ? "Это действие нельзя отменить. Все данные тренировки будут удалены."
                : "This action cannot be undone. All workout data will be deleted."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                {lang === "ru" ? "Отмена" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteWorkout.mutate()}
                disabled={deleteWorkout.isPending}
              >
                {deleteWorkout.isPending
                  ? (lang === "ru" ? "Удаление..." : "Deleting...")
                  : (lang === "ru" ? "Удалить" : "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

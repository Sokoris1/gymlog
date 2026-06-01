import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, ChevronLeft, Timer, Search } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setActiveWorkout } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function RestTimer({ onDismiss, lang }: { onDismiss: () => void; lang: string }) {
  const [seconds, setSeconds] = useState(90);
  useEffect(() => {
    if (seconds <= 0) { onDismiss(); return; }
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return (
    <div className="fixed bottom-24 left-4 right-4 bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg z-50">
      <div className="flex items-center gap-2">
        <Timer size={18} />
        <span className="font-semibold">{t("active.restTimer", lang as any)}: {formatTime(seconds)}</span>
      </div>
      <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={onDismiss}>
        {t("active.skip", lang as any)}
      </Button>
    </div>
  );
}

export default function ActiveWorkoutPage() {
  const [, params] = useRoute("/workout/active/:id");
  const [, navigate] = useLocation();
  const { userId } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const workoutId = Number(params?.id);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const workoutSeconds = useTimer(true);

  const { data: workoutData, isLoading } = useQuery({
    queryKey: ["/api/workout", workoutId],
    queryFn: () => apiRequest("GET", `/api/workout/${workoutId}`).then(r => r.json()),
    enabled: !!workoutId,
    refetchInterval: false,
  });

  const { data: exercises } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: () => apiRequest("GET", `/api/exercises`).then(r => r.json()),
  });

  const addExercise = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workout-exercises", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] });
      setShowAddExercise(false);
    },
  });

  const addSet = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sets", data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] }),
  });

  const updateSet = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/sets/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] }),
  });

  const deleteSet = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sets/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] }),
  });

  const finishWorkout = useMutation({
    mutationFn: () => {
      const durationMinutes = Math.round(workoutSeconds / 60);
      const endTime = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
      return apiRequest("PATCH", `/api/workout/${workoutId}`, { endTime, durationMinutes }).then(r => r.json());
    },
    onSuccess: (data) => {
      if (data.newPRs?.length > 0) {
        const prNames = data.newPRs.map((pr: any) => pr.exerciseName ?? "").filter(Boolean);
        toast({
          title: `🏆 ${data.newPRs.length} ${data.newPRs.length === 1 ? t("active.newPR", lang) : t("active.newPRs", lang)}`,
          description: prNames.join(", "),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      setActiveWorkout(null);
      navigate("/workout");
    },
  });

  const handleSetComplete = (set: any) => {
    updateSet.mutate({ id: set.id, data: { isCompleted: !set.isCompleted } });
    if (!set.isCompleted) setShowRestTimer(true);
  };

  const handleAddSet = (workoutExerciseId: number, currentSets: any[]) => {
    const lastSet = currentSets[currentSets.length - 1];
    addSet.mutate({
      workoutExerciseId,
      setNumber: currentSets.length + 1,
      weight: lastSet?.weight ?? 0,
      reps: lastSet?.reps ?? 0,
      isCompleted: false,
    });
  };

  const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];

  const muscleLabel = (mg: string) =>
    t(`exercises.muscles.${mg}` as any, lang) || mg;

  const filteredExercises = exercises?.filter((ex: any) => {
    const matchSearch = !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMuscle = !muscleFilter || ex.muscleGroup === muscleFilter;
    return matchSearch && matchMuscle;
  }) ?? [];

  const workoutExercises = workoutData?.exercises ?? [];
  const completedSets = workoutExercises.reduce((n: number, we: any) =>
    n + (we.sets?.filter((s: any) => s.isCompleted)?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-background pb-36">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button data-testid="button-back" onClick={() => navigate("/workout")}
            className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="font-semibold text-sm truncate">{workoutData?.title ?? "..."}</div>
            <div className="text-muted-foreground text-xs flex items-center gap-2">
              <Timer size={10} /> {formatTime(workoutSeconds)}
              <span>· {completedSets} {t("active.setsDone", lang)}</span>
            </div>
          </div>
          <Button data-testid="button-finish-workout" size="sm" className="rounded-xl font-semibold"
            onClick={() => finishWorkout.mutate()} disabled={finishWorkout.isPending}>
            {finishWorkout.isPending ? t("active.saving", lang) : t("active.finish", lang)}
          </Button>
        </div>
      </div>

      {/* Exercises */}
      <div className="px-4 pt-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">...</div>
        ) : workoutExercises.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">{t("active.noExercises", lang)}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("active.noExercisesSub", lang)}</p>
          </div>
        ) : (
          workoutExercises.map((we: any) => (
            <ExerciseBlock
              key={we.id}
              workoutExercise={we}
              lang={lang}
              onAddSet={() => handleAddSet(we.id, we.sets ?? [])}
              onSetComplete={(set: any) => handleSetComplete(set)}
              onUpdateSet={(setId: number, data: any) => updateSet.mutate({ id: setId, data })}
              onDeleteSet={(setId: number) => deleteSet.mutate(setId)}
            />
          ))
        )}

        <button data-testid="button-add-exercise" onClick={() => setShowAddExercise(true)}
          className="w-full border-2 border-dashed border-border rounded-2xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Plus size={18} />
          <span className="font-medium text-sm">{t("active.addExercise", lang)}</span>
        </button>
      </div>

      {showRestTimer && <RestTimer lang={lang} onDismiss={() => setShowRestTimer(false)} />}

      {/* Bottom Finish Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border p-4 safe-bottom">
        <Button data-testid="button-finish-bar" className="w-full h-12 font-semibold"
          onClick={() => finishWorkout.mutate()} disabled={finishWorkout.isPending}>
          {finishWorkout.isPending
            ? t("active.saving", lang)
            : `${t("active.finishBar", lang)} · ${formatTime(workoutSeconds)}`}
        </Button>
      </div>

      {/* Add Exercise Dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent className="bg-card border-card-border max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>{t("active.dialogTitle", lang)}</DialogTitle></DialogHeader>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-exercise-search"
              placeholder={t("active.searchPlaceholder", lang)}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 bg-background border-border"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
            <button onClick={() => setMuscleFilter("")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${!muscleFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {t("active.allFilter", lang)}
            </button>
            {muscleGroups.map(mg => (
              <button key={mg} onClick={() => setMuscleFilter(muscleFilter === mg ? "" : mg)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${muscleFilter === mg ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                {muscleLabel(mg)}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
            {filteredExercises.map((ex: any) => (
              <button key={ex.id} data-testid={`exercise-item-${ex.id}`}
                onClick={() => addExercise.mutate({ workoutId, exerciseId: ex.id, order: workoutExercises.length })}
                className="w-full bg-background border border-border rounded-xl p-3 flex items-center gap-2 hover-elevate text-left">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{ex.name}</div>
                  <div className="text-muted-foreground text-xs capitalize mt-0.5">
                    {muscleLabel(ex.muscleGroup)} · {t(`exercises.equip.${ex.equipment}` as any, lang) || ex.equipment}
                  </div>
                </div>
                <Plus size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseBlock({ workoutExercise: we, lang, onAddSet, onSetComplete, onUpdateSet, onDeleteSet }: any) {
  return (
    <div data-testid={`exercise-block-${we.id}`} className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-card-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">
            {t(`muscleShort.${we.exercise?.muscleGroup}` as any, lang) || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{we.exercise?.name ?? "Exercise"}</div>
          <div className="text-muted-foreground text-xs">
            {t(`exercises.muscles.${we.exercise?.muscleGroup}` as any, lang)} · {t(`exercises.equip.${we.exercise?.equipment}` as any, lang)}
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-1 grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-muted-foreground text-xs font-medium">
        <span>#</span><span>кг</span><span>Повт.</span><span>RPE</span><span></span>
      </div>

      <div className="px-4 pb-3 space-y-1.5">
        {(we.sets ?? []).map((set: any, idx: number) => (
          <SetRow key={set.id} set={set} index={idx}
            onComplete={() => onSetComplete(set)}
            onUpdate={(data: any) => onUpdateSet(set.id, data)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}
        <button data-testid={`button-add-set-${we.id}`} onClick={onAddSet}
          className="w-full py-2 rounded-xl border border-dashed border-border text-muted-foreground text-xs flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors">
          <Plus size={12} /> {t("active.addSet", lang)}
        </button>
      </div>
    </div>
  );
}

function SetRow({ set, index, onComplete, onUpdate }: any) {
  const [weight, setWeight] = useState(String(set.weight ?? 0));
  const [reps, setReps] = useState(String(set.reps ?? 0));
  const [rpe, setRpe] = useState(set.rpe ? String(set.rpe) : "");

  const handleBlur = () => {
    onUpdate({ weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, rpe: rpe ? parseFloat(rpe) : null });
  };

  return (
    <div data-testid={`set-row-${set.id}`}
      className={`grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center transition-colors ${set.isCompleted ? "opacity-70" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground text-center">{index + 1}</span>
      <input data-testid={`input-weight-${set.id}`} type="number" value={weight}
        onChange={e => setWeight(e.target.value)} onBlur={handleBlur}
        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="0" min="0" />
      <input data-testid={`input-reps-${set.id}`} type="number" value={reps}
        onChange={e => setReps(e.target.value)} onBlur={handleBlur}
        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="0" min="0" />
      <input data-testid={`input-rpe-${set.id}`} type="number" value={rpe}
        onChange={e => setRpe(e.target.value)} onBlur={handleBlur}
        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="–" min="1" max="10" step="0.5" />
      <button data-testid={`button-complete-set-${set.id}`} onClick={onComplete}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${set.isCompleted ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}>
        <Check size={13} />
      </button>
    </div>
  );
}

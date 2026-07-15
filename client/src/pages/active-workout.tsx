import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, ChevronLeft, Timer, Search, Trash2, X, Pencil, MessageSquare } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setActiveWorkout, getActiveWorkout } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { exerciseNameRu } from "@/lib/exerciseNames";

// ─── Timer ────────────────────────────────────────────────────────────────────
function useTimer(running: boolean, startTime: Date | null) {
  const getElapsed = () => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  };
  const [seconds, setSeconds] = useState(getElapsed);
  useEffect(() => {
    if (!running) return;
    setSeconds(getElapsed());
    const id = setInterval(() => setSeconds(getElapsed()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
}

function formatTime(s: number) {
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Number Input ─────────────────────────────────────────────────────────────
function NumInput({ value, onChange, onBlur, placeholder, testId, step, min, max }: {
  value: string; onChange: (v: string) => void; onBlur: () => void;
  placeholder?: string; testId?: string; step?: string; min?: string; max?: string;
}) {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0" || e.target.value === "0.0") onChange("");
    else e.target.select();
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || e.target.value === ".") onChange("0");
    onBlur();
  };
  return (
    <input
      data-testid={testId}
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      value={value}
      placeholder={placeholder ?? "0"}
      onChange={e => onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      step={step} min={min} max={max}
      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

// ─── Set Row ──────────────────────────────────────────────────────────────────
function SetRow({ set, index, onComplete, onUpdate, onDelete, lang }: any) {
  const [weight, setWeight] = useState(String(set.weight ?? 0));
  const [reps, setReps] = useState(String(set.reps ?? 0));
  const [rpe, setRpe] = useState(set.rpe ? String(set.rpe) : "");

  useEffect(() => { setWeight(String(set.weight ?? 0)); }, [set.weight]);
  useEffect(() => { setReps(String(set.reps ?? 0)); }, [set.reps]);
  useEffect(() => { setRpe(set.rpe ? String(set.rpe) : ""); }, [set.rpe]);

  const handleBlur = useCallback(() => {
    onUpdate({
      weight: parseFloat(weight.replace(",", ".")) || 0,
      reps: parseInt(reps) || 0,
      rpe: rpe ? parseFloat(rpe.replace(",", ".")) : null,
    });
  }, [weight, reps, rpe, onUpdate]);

  return (
    <div data-testid={`set-row-${set.id}`}
      className={`grid grid-cols-[1.5rem_1fr_1fr_1fr_2rem_2rem] gap-1.5 items-center transition-opacity ${set.isCompleted ? "opacity-60" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground text-center">{index + 1}</span>
      <NumInput testId={`input-weight-${set.id}`} value={weight} onChange={setWeight} onBlur={handleBlur} placeholder="0" min="0" step="0.5" />
      <NumInput testId={`input-reps-${set.id}`} value={reps} onChange={setReps} onBlur={handleBlur} placeholder="0" min="0" />
      <NumInput testId={`input-rpe-${set.id}`} value={rpe} onChange={setRpe} onBlur={handleBlur} placeholder="–" min="1" max="10" step="0.5" />
      <button data-testid={`button-complete-set-${set.id}`} onClick={onComplete}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${set.isCompleted ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}>
        <Check size={13} />
      </button>
      <button onClick={onDelete}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Exercise Block ───────────────────────────────────────────────────────────
function ExerciseBlock({
  workoutExercise: we, lang, index, total,
  onAddSet, onSetComplete, onUpdateSet, onDeleteSet,
  onDeleteExercise, onMoveUp, onMoveDown, onUpdateNote,
}: any) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteInput, setNoteInput] = useState(we.note ?? "");
  const ru = lang === "ru";
  const exName = ru
    ? (exerciseNameRu[we.exercise?.name ?? ""] ?? we.exercise?.name ?? "Exercise")
    : (we.exercise?.name ?? "Exercise");

  const hasNote = !!(we.note && we.note.trim());

  return (
    <div data-testid={`exercise-block-${we.id}`} className="bg-card border border-card-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-card-border flex items-center gap-2">
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0}
            className="w-5 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="w-5 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">
            {t(`muscleShort.${we.exercise?.muscleGroup}` as any, lang) || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{exName}</div>
          <div className="text-muted-foreground text-xs">
            {t(`exercises.muscles.${we.exercise?.muscleGroup}` as any, lang)} · {t(`exercises.equip.${we.exercise?.equipment}` as any, lang)}
          </div>
        </div>
        {/* Note button */}
        <button
          onClick={() => { setNoteInput(we.note ?? ""); setShowNoteDialog(true); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            hasNote
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          }`}>
          <MessageSquare size={14} />
        </button>
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Note preview */}
      {hasNote && (
        <div className="px-3 py-2 bg-primary/5 border-b border-card-border">
          <p className="text-xs text-primary/80 leading-relaxed">{we.note}</p>
        </div>
      )}

      {/* Column headers */}
      <div className="px-3 pt-2 pb-1 grid grid-cols-[1.5rem_1fr_1fr_1fr_2rem_2rem] gap-1.5 text-muted-foreground text-xs font-medium">
        <span className="text-center">#</span>
        <span className="text-center">{ru ? "кг" : "kg"}</span>
        <span className="text-center">{ru ? "Повт" : "Reps"}</span>
        <span className="text-center">RPE</span>
        <span></span><span></span>
      </div>

      {/* Sets */}
      <div className="px-3 pb-3 space-y-1.5">
        {(we.sets ?? []).map((set: any, idx: number) => (
          <SetRow
            key={set.id} set={set} index={idx} lang={lang}
            onComplete={() => onSetComplete(set)}
            onUpdate={(data: any) => onUpdateSet(set.id, data)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}
        <button data-testid={`button-add-set-${we.id}`} onClick={onAddSet}
          className="w-full py-2 rounded-xl border border-dashed border-border text-muted-foreground text-xs flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors mt-1">
          <Plus size={12} /> {t("active.addSet", lang)}
        </button>
      </div>

      {/* Note dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-3">
              {ru ? "Примечание" : "Note"}
            </h3>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder={ru ? "Болело плечо, жжение в мышце..." : "Shoulder pain, muscle burn..."}
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowNoteDialog(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button className="flex-1" onClick={() => {
                onUpdateNote(noteInput.trim());
                setShowNoteDialog(false);
              }}>
                {ru ? "Сохранить" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete exercise confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-2">
              {ru ? "Удалить упражнение?" : "Remove exercise?"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {ru ? `«${exName}» и все его подходы будут удалены из тренировки.` : `"${exName}" and all its sets will be removed.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => { onDeleteExercise(); setShowDeleteConfirm(false); }}>
                {ru ? "Удалить" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActiveWorkoutPage() {
  const [, params] = useRoute("/workout/active/:id");
  const [, navigate] = useLocation();
  const { userId } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const workoutId = Number(params?.id);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [exerciseOrder, setExerciseOrder] = useState<number[]>([]);

  const { startTime: workoutStartTime } = getActiveWorkout(userId);
  const workoutSeconds = useTimer(true, workoutStartTime);

  const { data: workoutData, isLoading } = useQuery({
    queryKey: ["/api/workout", workoutId],
    queryFn: () => apiRequest("GET", `/api/workout/${workoutId}`).then(r => r.json()),
    enabled: !!workoutId,
    refetchInterval: false,
  });

  const editMode = !!workoutData?.endTime;
  const originalDurationSeconds = (workoutData?.durationMinutes ?? 0) * 60;

  useEffect(() => {
    if (workoutData?.exercises) {
      setExerciseOrder(workoutData.exercises.map((we: any) => we.id));
    }
  }, [workoutData?.exercises?.length]);

  const { data: exercises } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: () => apiRequest("GET", `/api/exercises`).then(r => r.json()),
  });

  // Map of exerciseId -> last date performed, to sort the picker by recency.
  const { data: exerciseUsage } = useQuery<Record<number, string>>({
    queryKey: ["/api/users", userId, "exercise-usage"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/exercise-usage`).then(r => r.json()),
    enabled: !!userId,
  });

  const renameWorkout = useMutation({
    mutationFn: (title: string) => apiRequest("PATCH", `/api/workout/${workoutId}`, { title }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] });
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      setShowRenameDialog(false);
      toast({ title: lang === "ru" ? "Название обновлено" : "Title updated" });
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ weId, note }: { weId: number; note: string }) =>
      apiRequest("PATCH", `/api/workout-exercises/${weId}`, { note: note || null }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] }),
  });

  const addExercise = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workout-exercises", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] });
      setShowAddExercise(false);
    },
  });

  const deleteExercise = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/workout-exercises/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/workout", workoutId] }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      setActiveWorkout(null, userId);
      navigate("/workout");
    },
  });

  const saveEdits = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/workout/${workoutId}`, {}).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      toast({ title: lang === "ru" ? "Изменения сохранены" : "Changes saved" });
      navigate(`/workout/${workoutId}`);
    },
  });

  const handleBack = () => {
    if (editMode) navigate(`/workout/${workoutId}`);
    else navigate("/workout");
  };

  const handleFinishClick = () => {
    if (editMode) saveEdits.mutate();
    else setShowFinishConfirm(true);
  };

  const handleFinishConfirm = () => {
    setShowFinishConfirm(false);
    finishWorkout.mutate();
  };

  const handleSetComplete = (set: any) => {
    updateSet.mutate({ id: set.id, data: { isCompleted: !set.isCompleted } });
  };

  const handleAddSet = async (workoutExerciseId: number, exerciseId: number, currentSets: any[]) => {
    const lastSet = currentSets[currentSets.length - 1];
    let weight = lastSet?.weight ?? 0;
    let reps = lastSet?.reps ?? 0;
    // First set of this exercise: prefill weight AND reps from the heaviest set
    // of the user's most recent prior workout with this exercise.
    if (!lastSet) {
      try {
        const res = await apiRequest(
          "GET",
          `/api/exercises/${exerciseId}/last-weight/${userId}?excludeWorkoutId=${workoutId}`,
        ).then(r => r.json());
        if (res?.weight != null) weight = res.weight;
        if (res?.reps != null) reps = res.reps;
      } catch { /* fall back to 0 */ }
    }
    addSet.mutate({
      workoutExerciseId,
      setNumber: currentSets.length + 1,
      weight,
      reps,
      rpe: lastSet?.rpe ?? null,
      isCompleted: false,
    });
  };

  const handleMoveExercise = (id: number, direction: "up" | "down") => {
    setExerciseOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
  const muscleLabel = (mg: string) => t(`exercises.muscles.${mg}` as any, lang) || mg;

  const filteredExercises = exercises?.filter((ex: any) => {
    const matchSearch = !searchQuery ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exerciseNameRu[ex.name] ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchMuscle = !muscleFilter || ex.muscleGroup === muscleFilter;
    return matchSearch && matchMuscle;
  }) ?? [];

  // In the "All" tab, surface recently-performed exercises first (most recent
  // date on top); never-performed ones keep their original order at the bottom.
  const sortedExercises = muscleFilter
    ? filteredExercises
    : [...filteredExercises].sort((a: any, b: any) => {
        const da = exerciseUsage?.[a.id];
        const db = exerciseUsage?.[b.id];
        if (da && db) return da < db ? 1 : da > db ? -1 : 0;
        if (da) return -1;
        if (db) return 1;
        return 0;
      });

  const rawExercises: any[] = workoutData?.exercises ?? [];
  const workoutExercises = exerciseOrder.length > 0
    ? exerciseOrder.map(id => rawExercises.find(we => we.id === id)).filter(Boolean)
    : rawExercises;

  const completedSets = workoutExercises.reduce((n: number, we: any) =>
    n + (we.sets?.filter((s: any) => s.isCompleted)?.length ?? 0), 0);

  const ru = lang === "ru";
  const displaySeconds = editMode ? originalDurationSeconds : workoutSeconds;
  const isSaving = finishWorkout.isPending || saveEdits.isPending;
  const btnFinishLabel = editMode
    ? (ru ? "Сохранить" : "Save")
    : (finishWorkout.isPending ? t("active.saving", lang) : t("active.finish", lang));
  const btnFinishBarLabel = finishWorkout.isPending
    ? t("active.saving", lang)
    : `${t("active.finishBar", lang)} · ${formatTime(displaySeconds)}`;

  return (
    <div className="min-h-screen bg-background pb-36">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button data-testid="button-back" onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setTitleInput(workoutData?.title ?? ""); setShowRenameDialog(true); }}
                className="font-semibold text-sm truncate hover:text-primary transition-colors text-left max-w-[160px]"
                title={ru ? "Переименовать" : "Rename"}
              >
                {workoutData?.title ?? "..."}
              </button>
              <Pencil size={11} className="text-muted-foreground flex-shrink-0 cursor-pointer"
                onClick={() => { setTitleInput(workoutData?.title ?? ""); setShowRenameDialog(true); }} />
              {editMode && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {ru ? "Редактирование" : "Editing"}
                </span>
              )}
            </div>
            <div className="text-muted-foreground text-xs flex items-center gap-2">
              <Timer size={10} /> {formatTime(displaySeconds)}
              {!editMode && <span>· {completedSets} {t("active.setsDone", lang)}</span>}
            </div>
          </div>
          <Button data-testid="button-finish-workout" size="sm" className="rounded-xl font-semibold"
            onClick={handleFinishClick} disabled={isSaving}>
            {isSaving ? t("active.saving", lang) : btnFinishLabel}
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
          workoutExercises.map((we: any, idx: number) => (
            <ExerciseBlock
              key={we.id}
              workoutExercise={we}
              lang={lang}
              index={idx}
              total={workoutExercises.length}
              onAddSet={() => handleAddSet(we.id, we.exerciseId, we.sets ?? [])}
              onSetComplete={(set: any) => handleSetComplete(set)}
              onUpdateSet={(setId: number, data: any) => updateSet.mutate({ id: setId, data })}
              onDeleteSet={(setId: number) => deleteSet.mutate(setId)}
              onDeleteExercise={() => deleteExercise.mutate(we.id)}
              onMoveUp={() => handleMoveExercise(we.id, "up")}
              onMoveDown={() => handleMoveExercise(we.id, "down")}
              onUpdateNote={(note: string) => updateNote.mutate({ weId: we.id, note })}
            />
          ))
        )}

        <button data-testid="button-add-exercise" onClick={() => setShowAddExercise(true)}
          className="w-full border-2 border-dashed border-border rounded-2xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Plus size={18} />
          <span className="font-medium text-sm">{t("active.addExercise", lang)}</span>
        </button>
      </div>

      {/* Bottom bar */}
      {!editMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border p-4 safe-bottom">
          <Button data-testid="button-finish-bar" className="w-full h-12 font-semibold"
            onClick={handleFinishClick} disabled={isSaving}>
            {isSaving ? t("active.saving", lang) : btnFinishBarLabel}
          </Button>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-3">
              {ru ? "Переименовать тренировку" : "Rename workout"}
            </h3>
            <Input
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder={ru ? "Название тренировки" : "Workout title"}
              className="bg-background border-border mb-3"
              onKeyDown={e => { if (e.key === "Enter" && titleInput.trim()) renameWorkout.mutate(titleInput.trim()); }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRenameDialog(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button className="flex-1"
                disabled={!titleInput.trim() || renameWorkout.isPending}
                onClick={() => renameWorkout.mutate(titleInput.trim())}>
                {renameWorkout.isPending ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Confirmation */}
      {showFinishConfirm && !editMode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-base mb-2">
              {ru ? "Завершить тренировку?" : "Finish workout?"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {ru
                ? `Тренировка длилась ${formatTime(workoutSeconds)}. Вы уверены, что хотите завершить?`
                : `Workout duration: ${formatTime(workoutSeconds)}. Are you sure you want to finish?`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowFinishConfirm(false)}>
                {ru ? "Отмена" : "Cancel"}
              </Button>
              <Button className="flex-1" onClick={handleFinishConfirm}>
                {ru ? "Завершить" : "Finish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent
          className="bg-card border-card-border max-h-[85vh] overflow-hidden flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}>
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
            {sortedExercises.map((ex: any) => (
              <button key={ex.id} data-testid={`exercise-item-${ex.id}`}
                onClick={() => addExercise.mutate({ workoutId, exerciseId: ex.id, order: workoutExercises.length })}
                className="w-full bg-background border border-border rounded-xl p-3 flex items-center gap-2 hover-elevate text-left">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{lang === "ru" ? (exerciseNameRu[ex.name] ?? ex.name) : ex.name}</div>
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

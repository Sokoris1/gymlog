import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, TrendingUp, Plus, Trash2, Search, ChevronDown, Star } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exerciseNameRu } from "@/lib/exerciseNames";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const muscleGroupColors: Record<string, string> = {
  chest: "text-red-400", back: "text-blue-400", legs: "text-green-400",
  shoulders: "text-yellow-400", arms: "text-purple-400", core: "text-orange-400",
};
function exName(ex: any, lang: string) {
  return lang === "ru" ? (exerciseNameRu[ex?.name ?? ""] ?? ex?.name ?? "—") : (ex?.name ?? "—");
}
function today() { return new Date().toISOString().slice(0, 10); }

// ─── NumInput ────────────────────────────────────────────────────────────────
function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onFocus={e => { if (e.target.value === "0") onChange(""); }}
      onBlur={e => { if (e.target.value === "") onChange("0"); }}
      onChange={e => onChange(e.target.value)}
      className="bg-background border-border"
    />
  );
}

export default function ProgressPage() {
  const { userId } = useAuth();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const ru = lang === "ru";
  const { toast } = useToast();

  const [tab, setTab] = useState<"chart" | "records">("chart");

  // ── Chart tab state ──
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState("");

  // ── Records tab state ──
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "history">("manual");
  const [manualExerciseId, setManualExerciseId] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState("0");
  const [manualReps, setManualReps] = useState("0");
  const [manualDate, setManualDate] = useState(today());
  const [exSearch, setExSearch] = useState("");
  const [showExPicker, setShowExPicker] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Queries ──
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/prs", userId],
    queryFn: () => apiRequest("GET", `/api/prs/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: exercises } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: () => apiRequest("GET", "/api/exercises").then(r => r.json()),
  });

  const { data: bestSets, isLoading: bestLoading } = useQuery({
    queryKey: ["/api/users", userId, "best-sets"],
    queryFn: () => apiRequest("GET", `/api/users/${userId}/best-sets`).then(r => r.json()),
    enabled: !!userId && showAddRecord && addMode === "history",
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/exercises", selectedExerciseId, "progress", userId],
    queryFn: () => apiRequest("GET", `/api/exercises/${selectedExerciseId}/progress/${userId}`).then(r => r.json()),
    enabled: !!selectedExerciseId && !!userId,
  });

  // ── Mutations ──
  const createRecord = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/prs", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prs", userId] });
      toast({ title: ru ? "Рекорд сохранён" : "Record saved" });
      setShowAddRecord(false);
      resetForm();
    },
    onError: () => toast({ title: ru ? "Ошибка" : "Error", variant: "destructive" }),
  });

  const deleteRecord = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/prs/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prs", userId] });
      setDeleteConfirmId(null);
      toast({ title: ru ? "Рекорд удалён" : "Record deleted" });
    },
  });

  function resetForm() {
    setManualExerciseId(null);
    setManualWeight("0");
    setManualReps("0");
    setManualDate(today());
    setExSearch("");
    setAddMode("manual");
  }

  function handleManualSave() {
    if (!manualExerciseId) return toast({ title: ru ? "Выберите упражнение" : "Select exercise", variant: "destructive" });
    const w = parseFloat(manualWeight);
    const r = parseInt(manualReps);
    if (!w || !r) return toast({ title: ru ? "Введите вес и повторения" : "Enter weight and reps", variant: "destructive" });
    createRecord.mutate({ userId, exerciseId: manualExerciseId, weight: w, reps: r, date: manualDate });
  }

  function handleHistorySave(best: any) {
    createRecord.mutate({ userId, exerciseId: best.exerciseId, weight: best.weight, reps: best.reps, date: best.date });
  }

  // Already saved exerciseIds (for history mode — skip already saved)
  const savedIds = new Set((records ?? []).map((r: any) => r.exerciseId));

  const filteredExercises = (exercises ?? []).filter((e: any) =>
    exName(e, lang).toLowerCase().includes(exSearch.toLowerCase())
  );

  const selectedExercise = (exercises ?? []).find((e: any) => e.id === manualExerciseId);

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <h1 className="text-xl font-bold mb-4">{t("progress.title", lang)}</h1>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab("chart")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "chart" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {ru ? "График" : "Chart"}
        </button>
        <button
          onClick={() => setTab("records")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "records" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {ru ? "Рекорды" : "Records"}
        </button>
      </div>

      {/* ══════════════════ CHART TAB ══════════════════ */}
      {tab === "chart" && (
        <div>
          <p className="text-muted-foreground text-sm mb-4">
            {ru ? "Нажмите на рекорд чтобы увидеть динамику веса" : "Tap a record to see weight progress"}
          </p>
          {recordsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (records?.length ?? 0) === 0 ? (
            <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
              <Trophy size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">{ru ? "Нет рекордов" : "No records yet"}</p>
              <p className="text-muted-foreground text-xs mt-1">{ru ? "Добавьте рекорды во вкладке «Рекорды»" : "Add records in the Records tab"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec: any) => (
                <button key={rec.id}
                  onClick={() => { setSelectedExerciseId(rec.exerciseId); setSelectedExerciseName(exName(rec.exercise, lang)); }}
                  className="w-full bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 text-left hover-elevate">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    {rec.reps === 1 ? <Star size={18} className="text-yellow-400" /> : <Trophy size={18} className="text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{exName(rec.exercise, lang)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-primary font-semibold text-sm">{rec.weight} кг × {rec.reps}</span>
                      {rec.reps === 1 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md font-bold">1RM</span>}
                      <span className={`text-xs ${muscleGroupColors[rec.exercise?.muscleGroup] ?? "text-muted-foreground"}`}>
                        {t(`exercises.muscles.${rec.exercise?.muscleGroup}` as any, lang)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {format(parseISO(rec.date + "T00:00:00"), "d MMM", { locale })}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Progress Chart Dialog */}
          <Dialog open={!!selectedExerciseId} onOpenChange={open => { if (!open) setSelectedExerciseId(null); }}>
            <DialogContent className="bg-card border-card-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> {selectedExerciseName}
                </DialogTitle>
              </DialogHeader>
              {progressLoading ? <Skeleton className="h-40 w-full rounded-xl" /> :
                (progressData?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">{t("progress.noData", lang)}</div>
                ) : (
                  <div>
                    <div className="text-muted-foreground text-xs mb-3">{t("progress.chartTitle", lang)}</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={progressData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={v => format(parseISO(v + "T00:00:00"), "d MMM", { locale })} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--card-border))", borderRadius: "8px", fontSize: 12 }}
                          formatter={(v: any) => [`${v} кг`, ru ? "Вес" : "Weight"]}
                          labelFormatter={l => format(parseISO(l + "T00:00:00"), "d MMM yyyy", { locale })}
                        />
                        <Line type="monotone" dataKey="maxWeight" stroke="hsl(var(--primary))" strokeWidth={2.5}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══════════════════ RECORDS TAB ══════════════════ */}
      {tab === "records" && (
        <div>
          {/* Add button */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground text-sm">{(records?.length ?? 0)} {ru ? "рекордов" : "records"}</p>
            <Button size="sm" className="rounded-xl gap-1" onClick={() => setShowAddRecord(true)}>
              <Plus size={15} /> {ru ? "Добавить" : "Add"}
            </Button>
          </div>

          {recordsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (records?.length ?? 0) === 0 ? (
            <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
              <Trophy size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">{ru ? "Нет рекордов" : "No records yet"}</p>
              <p className="text-muted-foreground text-xs mt-1">{ru ? "Нажмите «Добавить» чтобы зафиксировать рекорд" : "Tap Add to log a record"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec: any) => (
                <div key={rec.id} className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    {rec.reps === 1 ? <Star size={18} className="text-yellow-400" /> : <Trophy size={18} className="text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{exName(rec.exercise, lang)}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-primary font-semibold text-sm">{rec.weight} кг × {rec.reps}</span>
                      {rec.reps === 1 && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md font-bold">1RM</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{format(parseISO(rec.date + "T00:00:00"), "d MMM", { locale })}</div>
                    <button onClick={() => setDeleteConfirmId(rec.id)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Add Record Dialog ── */}
          <Dialog open={showAddRecord} onOpenChange={open => { if (!open) { setShowAddRecord(false); resetForm(); } }}>
            <DialogContent className="bg-card border-card-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{ru ? "Добавить рекорд" : "Add Record"}</DialogTitle>
              </DialogHeader>

              {/* Mode switcher */}
              <div className="flex gap-1 bg-muted rounded-xl p-1 mt-1">
                <button onClick={() => setAddMode("manual")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${addMode === "manual" ? "bg-card text-foreground" : "text-muted-foreground"}`}>
                  {ru ? "Вручную" : "Manual"}
                </button>
                <button onClick={() => setAddMode("history")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${addMode === "history" ? "bg-card text-foreground" : "text-muted-foreground"}`}>
                  {ru ? "Из истории" : "From history"}
                </button>
              </div>

              {addMode === "manual" && (
                <div className="space-y-3 mt-2">
                  {/* Exercise picker */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{ru ? "Упражнение" : "Exercise"}</label>
                    <button
                      onClick={() => setShowExPicker(true)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-left text-sm flex items-center justify-between">
                      <span className={selectedExercise ? "text-foreground" : "text-muted-foreground"}>
                        {selectedExercise ? exName(selectedExercise, lang) : (ru ? "Выберите упражнение" : "Select exercise")}
                      </span>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{ru ? "Вес (кг)" : "Weight (kg)"}</label>
                      <NumInput value={manualWeight} onChange={setManualWeight} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{ru ? "Повторения" : "Reps"}</label>
                      <NumInput value={manualReps} onChange={setManualReps} placeholder="0" />
                    </div>
                  </div>
                  {parseInt(manualReps) === 1 && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 rounded-xl px-3 py-2">
                      <Star size={14} className="text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">{ru ? "Будет помечено как 1RM" : "Will be marked as 1RM"}</span>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{ru ? "Дата" : "Date"}</label>
                    <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                      className="bg-background border-border" />
                  </div>
                  <Button className="w-full" onClick={handleManualSave} disabled={createRecord.isPending}>
                    {createRecord.isPending ? (ru ? "Сохранение..." : "Saving...") : (ru ? "Сохранить" : "Save")}
                  </Button>
                </div>
              )}

              {addMode === "history" && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-3">{ru ? "Лучший результат по каждому упражнению из ваших тренировок" : "Best result per exercise from your workouts"}</p>
                  {bestLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
                  ) : (bestSets?.length ?? 0) === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-6">{ru ? "Нет данных о тренировках" : "No workout history"}</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {bestSets.map((b: any) => {
                        const alreadySaved = savedIds.has(b.exerciseId);
                        return (
                          <div key={b.exerciseId}
                            className={`bg-background border border-border rounded-xl p-3 flex items-center gap-3 ${alreadySaved ? "opacity-50" : ""}`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{exName(b.exercise, lang)}</div>
                              <div className="text-primary text-xs font-semibold mt-0.5">{b.weight} кг × {b.reps}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{format(parseISO(b.date + "T00:00:00"), "d MMM", { locale })}</span>
                              <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs"
                                disabled={alreadySaved || createRecord.isPending}
                                onClick={() => handleHistorySave(b)}>
                                {alreadySaved ? "✓" : (ru ? "Сохранить" : "Save")}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Exercise picker sheet */}
          {showExPicker && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
              <div className="bg-card border border-card-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-sm mb-3">{ru ? "Выберите упражнение" : "Select exercise"}</h3>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-8 bg-background border-border" placeholder={ru ? "Поиск..." : "Search..."} value={exSearch} onChange={e => setExSearch(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                  {filteredExercises.map((e: any) => (
                    <button key={e.id} onClick={() => { setManualExerciseId(e.id); setShowExPicker(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors flex items-center justify-between ${manualExerciseId === e.id ? "bg-primary/10 text-primary" : ""}`}>
                      <span>{exName(e, lang)}</span>
                      {manualExerciseId === e.id && <span className="text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-border">
                  <Button variant="outline" className="w-full" onClick={() => setShowExPicker(false)}>{ru ? "Отмена" : "Cancel"}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deleteConfirmId !== null && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
              <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
                <h3 className="font-semibold text-base mb-2">{ru ? "Удалить рекорд?" : "Delete record?"}</h3>
                <p className="text-muted-foreground text-sm mb-4">{ru ? "Это действие нельзя отменить." : "This cannot be undone."}</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>{ru ? "Отмена" : "Cancel"}</Button>
                  <Button variant="destructive" className="flex-1" disabled={deleteRecord.isPending}
                    onClick={() => deleteRecord.mutate(deleteConfirmId!)}>
                    {deleteRecord.isPending ? (ru ? "Удаление..." : "Deleting...") : (ru ? "Удалить" : "Delete")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

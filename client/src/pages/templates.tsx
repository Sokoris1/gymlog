import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Dumbbell, ChevronRight, LayoutTemplate, Play, Search, X, Trash2, Pencil } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { exerciseNameRu } from "@/lib/exerciseNames";
import { setActiveWorkout } from "@/lib/store";

const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];

export default function TemplatesPage() {
  const { userId, user, login } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createExIds, setCreateExIds] = useState<number[]>([]);

  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editExIds, setEditExIds] = useState<number[]>([]);

  const [pickerFor, setPickerFor] = useState<"create" | "edit" | null>(null);
  const [exSearch, setExSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // ── Programs
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [progEditing, setProgEditing] = useState<any>(null); // null = closed, {} = new, {...} = edit
  const [progName, setProgName] = useState("");
  const [progWeeks, setProgWeeks] = useState(4);
  const [progDays, setProgDays] = useState<Record<number, number | null>>({});
  const [progDayPicker, setProgDayPicker] = useState<number | null>(null); // weekday index being assigned

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: () => apiRequest("GET", "/api/templates").then(r => r.json()),
  });

  const { data: exercises } = useQuery({
    queryKey: ["/api/exercises"],
    queryFn: () => apiRequest("GET", "/api/exercises").then(r => r.json()),
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
    queryFn: () => apiRequest("GET", "/api/programs").then(r => r.json()),
  });

  const createTemplate = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/templates", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setShowCreate(false);
      setCreateName("");
      setCreateExIds([]);
      toast({ title: lang === "ru" ? "Шаблон создан" : "Template created" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/templates/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setEditTemplate(null);
      toast({ title: lang === "ru" ? "Шаблон обновлён" : "Template updated" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/templates/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setSelectedTemplate(null);
      toast({ title: lang === "ru" ? "Шаблон удалён" : "Template deleted" });
    },
  });

  const saveProgram = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: any }) =>
      id
        ? apiRequest("PATCH", `/api/programs/${id}`, data).then(r => r.json())
        : apiRequest("POST", "/api/programs", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setProgEditing(null);
      setSelectedProgram(null);
      toast({ title: lang === "ru" ? "Программа сохранена" : "Program saved" });
    },
  });

  const deleteProgram = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/programs/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setSelectedProgram(null);
      toast({ title: lang === "ru" ? "Программа удалена" : "Program deleted" });
    },
  });

  const setActiveProgram = useMutation({
    mutationFn: (programId: number | null) =>
      apiRequest("PATCH", `/api/users/${userId}`, { activeProgramId: programId }).then(r => r.json()),
    onSuccess: (data, programId) => {
      if (data?.id) login(data);
      toast({
        title: programId == null
          ? (lang === "ru" ? "Программа отключена" : "Program deactivated")
          : (lang === "ru" ? "Программа выбрана" : "Program selected"),
      });
    },
  });

  const activeProgramId = user?.activeProgramId ?? null;

  const exName = (ex: any) =>
    lang === "ru" ? (exerciseNameRu[ex.name] ?? ex.name) : ex.name;

  const getExerciseNames = (tpl: any) => {
    const ids: number[] = JSON.parse(tpl?.exerciseIds ?? "[]");
    return ids
      .map((id: number) => exercises?.find((ex: any) => ex.id === id))
      .filter(Boolean)
      .map((ex: any) => exName(ex));
  };

  const muscleLabel = (mg: string) => t(`exercises.muscles.${mg}` as any, lang) || mg;

  const filteredExercises = exercises?.filter((ex: any) => {
    const matchSearch =
      ex.name.toLowerCase().includes(exSearch.toLowerCase()) ||
      (lang === "ru" && (exerciseNameRu[ex.name] ?? "").toLowerCase().includes(exSearch.toLowerCase()));
    const matchMuscle = muscleFilter === "all" || ex.muscleGroup === muscleFilter;
    return matchSearch && matchMuscle;
  }) ?? [];

  const activeExIds = pickerFor === "create" ? createExIds : editExIds;
  const setActiveExIds = pickerFor === "create" ? setCreateExIds : setEditExIds;

  const toggleExercise = (id: number) =>
    setActiveExIds((prev: number[]) =>
      prev.includes(id) ? prev.filter((x: number) => x !== id) : [...prev, id]
    );

  const weekdayNames = lang === "ru"
    ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const openCreate = () => {
    setCreateName(""); setCreateExIds([]); setExSearch(""); setMuscleFilter("all"); setShowCreate(true);
  };

  const openEdit = (tpl: any) => {
    setEditTemplate(tpl);
    setEditName(tpl.name);
    setEditExIds(JSON.parse(tpl.exerciseIds ?? "[]"));
    setSelectedTemplate(null);
  };

  const templateName = (id: number | null | undefined) => {
    if (id == null) return null;
    const tpl = templates?.find((tp: any) => tp.id === id);
    return tpl?.name ?? null;
  };

  const parseDays = (p: any): Record<number, number | null> => {
    const arr = JSON.parse(p?.days ?? "[]");
    const map: Record<number, number | null> = {};
    arr.forEach((d: any) => { map[d.weekday] = d.templateId ?? null; });
    return map;
  };

  const openProgramCreate = () => {
    setProgName(""); setProgWeeks(4); setProgDays({}); setProgEditing({});
  };

  const openProgramEdit = (p: any) => {
    setProgName(p.name);
    setProgWeeks(p.durationWeeks);
    setProgDays(parseDays(p));
    setProgEditing(p);
    setSelectedProgram(null);
  };

  const submitProgram = () => {
    if (!progName.trim()) return;
    const days = [0, 1, 2, 3, 4, 5, 6].map(wd => ({
      weekday: wd,
      templateId: progDays[wd] ?? null,
      label: templateName(progDays[wd]) ?? "Rest",
    }));
    const data: any = {
      name: progName.trim(),
      durationWeeks: Number(progWeeks) || 1,
      days: JSON.stringify(days),
      isSystem: false,
      createdByUserId: userId,
    };
    saveProgram.mutate({ id: progEditing?.id, data });
  };

  const startFromTemplateId = async (templateId: number) => {
    const tpl = templates?.find((tp: any) => tp.id === templateId);
    if (!tpl) return;
    const workout = await apiRequest("POST", "/api/workouts", {
      userId,
      title: tpl.name,
      date: new Date().toISOString().split("T")[0],
      startTime: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      templateId: tpl.id,
    }).then(r => r.json());

    const exerciseIds = JSON.parse(tpl.exerciseIds ?? "[]");
    for (let i = 0; i < exerciseIds.length; i++) {
      await apiRequest("POST", "/api/workout-exercises", {
        workoutId: workout.id, exerciseId: exerciseIds[i], order: i,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
    setActiveWorkout(workout.id, userId);
    navigate(`/workout/active/${workout.id}`);
  };

  const todayWeekday = new Date().getDay();
  const todaysTemplateId = (p: any): number | null => {
    const map = parseDays(p);
    return map[todayWeekday] ?? null;
  };

  const ExercisePickerRow = ({ id }: { id: number }) => {
    const ex = exercises?.find((e: any) => e.id === id);
    if (!ex) return null;
    const isFor = pickerFor === "create" ? createExIds : editExIds;
    const selected = isFor.includes(id);
    return (
      <button
        onClick={() => toggleExercise(id)}
        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
          selected ? "bg-primary/15 border border-primary/40" : "bg-background border border-border hover:bg-muted/50"
        }`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-primary text-primary-foreground" : "bg-primary/10"
        }`}>
          {selected ? <span className="text-xs font-bold">✓</span> : <Dumbbell size={12} className="text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{exName(ex)}</div>
          <div className="text-xs text-muted-foreground">{muscleLabel(ex.muscleGroup)}</div>
        </div>
      </button>
    );
  };

  const SelectedList = ({ exIds, setExIds }: { exIds: number[]; setExIds: (v: number[]) => void }) => (
    exIds.length > 0 ? (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">
          {lang === "ru" ? "Упражнения" : "Exercises"} ({exIds.length})
        </p>
        {exIds.map((id: number) => {
          const ex = exercises?.find((e: any) => e.id === id);
          if (!ex) return null;
          return (
            <div key={id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <Dumbbell size={13} className="text-primary flex-shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{exName(ex)}</span>
              <button onClick={() => setExIds(exIds.filter((x: number) => x !== id))} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t("templates.title", lang)}</h1>
        <Button size="sm" className="rounded-xl gap-1" onClick={openCreate}>
          <Plus size={16} /> {lang === "ru" ? "Шаблон" : "Template"}
        </Button>
      </div>

      {/* Templates list */}
      <div className="mb-6">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">{t("templates.templatesLabel", lang)}</h2>
        <div className="space-y-2">
          {templates?.map((tpl: any) => {
            const exNames = getExerciseNames(tpl);
            return (
              <button key={tpl.id} data-testid={`template-card-${tpl.id}`}
                onClick={() => setSelectedTemplate(tpl)}
                className="w-full bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 text-left hover-elevate">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <LayoutTemplate size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tpl.name}</div>
                  <div className="text-muted-foreground text-xs truncate">
                    {exNames.length === 0
                      ? (lang === "ru" ? "Нет упражнений" : "No exercises")
                      : exNames.slice(0, 3).join(", ") + (exNames.length > 3 ? ` +${exNames.length - 3}` : "")}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {tpl.isSystem && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t("templates.system", lang)}</span>}
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Programs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted-foreground">{t("templates.programsLabel", lang)}</h2>
          <Button size="sm" variant="outline" className="rounded-xl gap-1 h-7 text-xs" onClick={openProgramCreate}>
            <Plus size={14} /> {lang === "ru" ? "Программа" : "Program"}
          </Button>
        </div>
        <div className="space-y-2">
          {(programs?.length ?? 0) === 0 && (
            <p className="text-muted-foreground text-xs text-center py-4">
              {lang === "ru" ? "Нет программ" : "No programs"}
            </p>
          )}
          {programs?.map((p: any) => {
            const days = JSON.parse(p.days ?? "[]");
            const activeDays = days.filter((d: any) => d.templateId);
            const isActive = p.id === activeProgramId;
            return (
              <button key={p.id} data-testid={`program-card-${p.id}`}
                onClick={() => setSelectedProgram(p)}
                className={`w-full text-left bg-card border rounded-2xl p-4 hover-elevate ${
                  isActive ? "border-primary" : "border-card-border"
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {p.durationWeeks} {t("templates.weeks", lang)} · {activeDays.length} {t("templates.trainingDays", lang)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isActive && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{lang === "ru" ? "Активна" : "Active"}</span>}
                    {p.isSystem && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t("templates.system", lang)}</span>}
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {weekdayNames.map((day, idx) => {
                    const progDay = days.find((d: any) => d.weekday === idx);
                    const hasTraining = progDay?.templateId != null;
                    const isToday = idx === todayWeekday;
                    return (
                      <div key={day} className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-[9px] font-semibold ${
                        hasTraining ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}>
                        {day[0]}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Template detail dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="truncate">{selectedTemplate?.name}</DialogTitle>
              {!selectedTemplate?.isSystem && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(selectedTemplate)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={lang === "ru" ? "Редактировать" : "Edit"}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteTemplate.mutate(selectedTemplate.id)}
                    className="text-destructive hover:text-destructive/70 transition-colors p-1"
                    aria-label={lang === "ru" ? "Удалить" : "Delete"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-1.5 mt-2">
            {(() => {
              const ids: number[] = JSON.parse(selectedTemplate?.exerciseIds ?? "[]");
              const items = ids
                .map((id: number) => exercises?.find((ex: any) => ex.id === id))
                .filter(Boolean);
              if (items.length === 0) return (
                <p className="text-muted-foreground text-sm text-center py-4">
                  {lang === "ru" ? "В шаблоне нет упражнений" : "No exercises in this template"}
                </p>
              );
              return items.map((ex: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg p-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{exName(ex)}</div>
                    <div className="text-xs text-muted-foreground">{muscleLabel(ex.muscleGroup)}</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit template dialog */}
      <Dialog open={!!editTemplate} onOpenChange={v => { if (!v) setEditTemplate(null); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="pr-6">{lang === "ru" ? "Редактировать шаблон" : "Edit Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("templates.namePlaceholder", lang)}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="bg-background border-border"
            />
            <SelectedList exIds={editExIds} setExIds={setEditExIds} />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setExSearch(""); setMuscleFilter("all"); setPickerFor("edit"); }}
            >
              <Plus size={15} />
              {lang === "ru" ? "Добавить упражнения" : "Add Exercises"}
            </Button>
            <Button
              className="w-full"
              disabled={updateTemplate.isPending || !editName.trim()}
              onClick={() => {
                if (!editName.trim() || !editTemplate) return;
                updateTemplate.mutate({
                  id: editTemplate.id,
                  data: { name: editName.trim(), exerciseIds: JSON.stringify(editExIds) },
                });
              }}
            >
              {updateTemplate.isPending
                ? (lang === "ru" ? "Сохранение..." : "Saving...")
                : (lang === "ru" ? "Сохранить" : "Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create template dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="pr-6">{t("templates.createTitle", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              data-testid="input-template-name"
              placeholder={t("templates.namePlaceholder", lang)}
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              className="bg-background border-border"
            />
            <SelectedList exIds={createExIds} setExIds={setCreateExIds} />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setExSearch(""); setMuscleFilter("all"); setPickerFor("create"); }}
            >
              <Plus size={15} />
              {lang === "ru" ? "Добавить упражнения" : "Add Exercises"}
            </Button>
            <Button
              data-testid="button-save-template"
              className="w-full"
              disabled={createTemplate.isPending || !createName.trim()}
              onClick={() => {
                if (!createName.trim()) return;
                createTemplate.mutate({
                  name: createName.trim(),
                  isSystem: false,
                  createdByUserId: userId,
                  exerciseIds: JSON.stringify(createExIds),
                });
              }}
            >
              {t("templates.createBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Shared exercise picker */}
      <Dialog open={pickerFor !== null} onOpenChange={v => { if (!v) setPickerFor(null); }}>
        <DialogContent className="bg-card border-card-border overflow-hidden">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {lang === "ru" ? "Выбрать упражнения" : "Select Exercises"}
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={lang === "ru" ? "Поиск..." : "Search..."}
              value={exSearch}
              onChange={e => setExSearch(e.target.value)}
              className="pl-8 bg-background border-border"
            />
          </div>

          {/* Muscle group filter chips — negative margin to break out of dialog padding, own px */}
          <div className="-mx-6 px-6 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setMuscleFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                muscleFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {lang === "ru" ? "Все" : "All"}
            </button>
            {muscleGroups.map(mg => (
              <button
                key={mg}
                onClick={() => setMuscleFilter(muscleFilter === mg ? "all" : mg)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${
                  muscleFilter === mg
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {muscleLabel(mg)}
              </button>
            ))}
          </div>

          {/* Exercise list */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredExercises.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                {lang === "ru" ? "Ничего не найдено" : "Nothing found"}
              </p>
            ) : (
              filteredExercises.map((ex: any) => (
                <ExercisePickerRow key={ex.id} id={ex.id} />
              ))
            )}
          </div>

          <Button className="w-full" onClick={() => setPickerFor(null)}>
            {lang === "ru" ? `Готово (${activeExIds.length})` : `Done (${activeExIds.length})`}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Program detail dialog */}
      <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="truncate">{selectedProgram?.name}</DialogTitle>
              {!selectedProgram?.isSystem && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openProgramEdit(selectedProgram)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={lang === "ru" ? "Редактировать" : "Edit"}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteProgram.mutate(selectedProgram.id)}
                    className="text-destructive hover:text-destructive/70 transition-colors p-1"
                    aria-label={lang === "ru" ? "Удалить" : "Delete"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedProgram && (
            <div className="space-y-3 mt-2">
              <div className="text-muted-foreground text-xs">
                {selectedProgram.durationWeeks} {t("templates.weeks", lang)}
              </div>

              {/* Active program toggle */}
              {selectedProgram.id === activeProgramId ? (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={setActiveProgram.isPending}
                  onClick={() => setActiveProgram.mutate(null)}
                >
                  <span className="text-primary font-semibold">✓ {lang === "ru" ? "Активна" : "Active"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{lang === "ru" ? "Отключить" : "Deactivate"}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={setActiveProgram.isPending}
                  onClick={() => setActiveProgram.mutate(selectedProgram.id)}
                >
                  {lang === "ru" ? "Выбрать как мою программу" : "Set as my program"}
                </Button>
              )}

              {/* Start today's training */}
              {(() => {
                const tid = todaysTemplateId(selectedProgram);
                const todayName = weekdayNames[todayWeekday];
                if (tid == null) return (
                  <div className="bg-background border border-border rounded-xl p-3 text-center text-muted-foreground text-sm">
                    {lang === "ru" ? `Сегодня (${todayName}) — отдых` : `Today (${todayName}) — rest day`}
                  </div>
                );
                return (
                  <Button
                    className="w-full gap-2"
                    onClick={() => { setSelectedProgram(null); startFromTemplateId(tid); }}
                  >
                    <Play size={15} />
                    {lang === "ru" ? `Начать сегодня: ${templateName(tid)}` : `Start today: ${templateName(tid)}`}
                  </Button>
                );
              })()}

              {/* Weekly schedule */}
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map(wd => {
                  const map = parseDays(selectedProgram);
                  const tid = map[wd] ?? null;
                  const isToday = wd === todayWeekday;
                  return (
                    <div key={wd} className={`flex items-center gap-3 bg-background border rounded-lg px-3 py-2.5 ${
                      isToday ? "border-primary" : "border-border"
                    }`}>
                      <div className="w-9 text-xs font-semibold text-muted-foreground">{weekdayNames[wd]}</div>
                      {tid != null ? (
                        <>
                          <Dumbbell size={13} className="text-primary flex-shrink-0" />
                          <span className="text-sm flex-1 min-w-0 truncate">{templateName(tid) ?? "—"}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground flex-1">{lang === "ru" ? "Отдых" : "Rest"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Program create / edit dialog */}
      <Dialog open={!!progEditing} onOpenChange={v => { if (!v) setProgEditing(null); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {progEditing?.id
                ? (lang === "ru" ? "Редактировать программу" : "Edit Program")
                : (lang === "ru" ? "Новая программа" : "New Program")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={lang === "ru" ? "Название программы" : "Program name"}
              value={progName}
              onChange={e => setProgName(e.target.value)}
              className="bg-background border-border"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">{lang === "ru" ? "Длительность (недель)" : "Duration (weeks)"}</label>
              <Input
                type="number" min={1} max={52}
                value={progWeeks}
                onChange={e => setProgWeeks(Number(e.target.value))}
                className="bg-background border-border w-20"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">{lang === "ru" ? "Расписание" : "Schedule"}</p>
              {[1, 2, 3, 4, 5, 6, 0].map(wd => {
                const tid = progDays[wd] ?? null;
                return (
                  <button
                    key={wd}
                    onClick={() => setProgDayPicker(wd)}
                    className="w-full flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-9 text-xs font-semibold text-muted-foreground">{weekdayNames[wd]}</div>
                    {tid != null ? (
                      <span className="text-sm flex-1 min-w-0 truncate">{templateName(tid) ?? "—"}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground flex-1">{lang === "ru" ? "Отдых" : "Rest"}</span>
                    )}
                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full"
              disabled={saveProgram.isPending || !progName.trim()}
              onClick={submitProgram}
            >
              {saveProgram.isPending
                ? (lang === "ru" ? "Сохранение..." : "Saving...")
                : (lang === "ru" ? "Сохранить" : "Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Program day → template picker */}
      <Dialog open={progDayPicker !== null} onOpenChange={v => { if (!v) setProgDayPicker(null); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {progDayPicker !== null
                ? (lang === "ru" ? `Тренировка: ${weekdayNames[progDayPicker]}` : `Training: ${weekdayNames[progDayPicker]}`)
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            <button
              onClick={() => {
                if (progDayPicker !== null) setProgDays(prev => ({ ...prev, [progDayPicker]: null }));
                setProgDayPicker(null);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left bg-background border border-border hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-muted-foreground">{lang === "ru" ? "Отдых (без тренировки)" : "Rest (no training)"}</span>
            </button>
            {templates?.map((tpl: any) => {
              const selected = progDayPicker !== null && progDays[progDayPicker] === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => {
                    if (progDayPicker !== null) setProgDays(prev => ({ ...prev, [progDayPicker]: tpl.id }));
                    setProgDayPicker(null);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? "bg-primary/15 border border-primary/40" : "bg-background border border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {JSON.parse(tpl.exerciseIds ?? "[]").length} {lang === "ru" ? "упр." : "ex."}
                    </div>
                  </div>
                  {selected && <span className="text-xs font-bold text-primary">✓</span>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

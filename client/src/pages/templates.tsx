import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Dumbbell, ChevronRight, LayoutTemplate, Search, X, Trash2, Pencil } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function TemplatesPage() {
  const { userId } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();

  // ── create state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createExIds, setCreateExIds] = useState<number[]>([]);

  // ── edit state
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editExIds, setEditExIds] = useState<number[]>([]);

  // ── exercise picker (shared for create & edit)
  const [pickerFor, setPickerFor] = useState<"create" | "edit" | null>(null);
  const [exSearch, setExSearch] = useState("");

  // ── detail
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

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

  const getExerciseNames = (tpl: any) => {
    const ids: number[] = JSON.parse(tpl?.exerciseIds ?? "[]");
    return ids.map((id: number) => exercises?.find((ex: any) => ex.id === id)?.name ?? "").filter(Boolean);
  };

  const filteredExercises = exercises?.filter((ex: any) =>
    ex.name.toLowerCase().includes(exSearch.toLowerCase())
  ) ?? [];

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
    setCreateName(""); setCreateExIds([]); setExSearch(""); setShowCreate(true);
  };

  const openEdit = (tpl: any) => {
    setEditTemplate(tpl);
    setEditName(tpl.name);
    setEditExIds(JSON.parse(tpl.exerciseIds ?? "[]"));
    setSelectedTemplate(null);
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
          <div className="text-sm font-medium truncate">{ex.name}</div>
          <div className="text-xs text-muted-foreground">{ex.muscleGroup}</div>
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
              <span className="text-sm flex-1">{ex.name}</span>
              <button onClick={() => setExIds(exIds.filter((x: number) => x !== id))} className="text-muted-foreground hover:text-foreground">
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
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">{t("templates.programsLabel", lang)}</h2>
        <div className="space-y-2">
          {programs?.map((p: any) => {
            const days = JSON.parse(p.days ?? "[]");
            const activeDays = days.filter((d: any) => d.templateId);
            return (
              <div key={p.id} data-testid={`program-card-${p.id}`} className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {p.durationWeeks} {t("templates.weeks", lang)} · {activeDays.length} {t("templates.trainingDays", lang)}
                    </div>
                  </div>
                  {p.isSystem && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t("templates.system", lang)}</span>}
                </div>
                <div className="flex gap-1">
                  {weekdayNames.map((day, idx) => {
                    const progDay = days.find((d: any) => d.weekday === idx);
                    const hasTraining = progDay?.templateId != null;
                    return (
                      <div key={day} className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-[9px] font-semibold ${
                        hasTraining ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {day[0]}
                      </div>
                    );
                  })}
                </div>
              </div>
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
            {getExerciseNames(selectedTemplate ?? {}).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                {lang === "ru" ? "В шаблоне нет упражнений" : "No exercises in this template"}
              </p>
            ) : (
              getExerciseNames(selectedTemplate ?? {}).map((name: string, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg p-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Dumbbell size={12} className="text-primary" />
                  </div>
                  <span className="text-sm">{name}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit template dialog */}
      <Dialog open={!!editTemplate} onOpenChange={v => { if (!v) setEditTemplate(null); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{lang === "ru" ? "Редактировать шаблон" : "Edit Template"}</DialogTitle></DialogHeader>
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
              onClick={() => { setExSearch(""); setPickerFor("edit"); }}
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
          <DialogHeader><DialogTitle>{t("templates.createTitle", lang)}</DialogTitle></DialogHeader>
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
              onClick={() => { setExSearch(""); setPickerFor("create"); }}
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
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>{lang === "ru" ? "Выбрать упражнения" : "Select Exercises"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={lang === "ru" ? "Поиск..." : "Search..."}
                value={exSearch}
                onChange={e => setExSearch(e.target.value)}
                className="pl-8 bg-background border-border"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map((ex: any) => (
                <ExercisePickerRow key={ex.id} id={ex.id} />
              ))}
            </div>
            <Button className="w-full" onClick={() => setPickerFor(null)}>
              {lang === "ru"
                ? `Готово (${activeExIds.length})`
                : `Done (${activeExIds.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

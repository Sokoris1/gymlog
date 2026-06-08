import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Dumbbell, ChevronRight, LayoutTemplate, Search, X, Trash2 } from "lucide-react";
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
  const [showCreate, setShowCreate] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [name, setName] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
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
      setName("");
      setSelectedExerciseIds([]);
      toast({ title: lang === "ru" ? "Шаблон создан" : "Template created" });
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
    return ids.map(id => exercises?.find((ex: any) => ex.id === id)?.name ?? "").filter(Boolean);
  };

  const filteredExercises = exercises?.filter((ex: any) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  ) ?? [];

  const toggleExercise = (id: number) => {
    setSelectedExerciseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const weekdayNames = lang === "ru"
    ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const openCreate = () => {
    setName("");
    setSelectedExerciseIds([]);
    setExerciseSearch("");
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t("templates.title", lang)}</h1>
        <Button size="sm" className="rounded-xl gap-1" onClick={openCreate}>
          <Plus size={16} /> {lang === "ru" ? "Шаблон" : "Template"}
        </Button>
      </div>

      {/* Templates */}
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
                      <div key={day} className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-[9px] font-semibold ${hasTraining ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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

      {/* Template detail */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
              {!selectedTemplate?.isSystem && (
                <button
                  onClick={() => deleteTemplate.mutate(selectedTemplate.id)}
                  className="text-destructive hover:text-destructive/80 transition-colors p-1"
                  aria-label={lang === "ru" ? "Удалить шаблон" : "Delete template"}
                >
                  <Trash2 size={16} />
                </button>
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

      {/* Create template — step 1: name + selected exercises */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{t("templates.createTitle", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              data-testid="input-template-name"
              placeholder={t("templates.namePlaceholder", lang)}
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-background border-border"
            />

            {/* Selected exercises list */}
            {selectedExerciseIds.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">
                  {lang === "ru" ? "Упражнения" : "Exercises"} ({selectedExerciseIds.length})
                </p>
                {selectedExerciseIds.map(id => {
                  const ex = exercises?.find((e: any) => e.id === id);
                  if (!ex) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                      <Dumbbell size={13} className="text-primary flex-shrink-0" />
                      <span className="text-sm flex-1">{ex.name}</span>
                      <button onClick={() => toggleExercise(id)} className="text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setExerciseSearch(""); setShowExercisePicker(true); }}
            >
              <Plus size={15} />
              {lang === "ru" ? "Добавить упражнения" : "Add Exercises"}
            </Button>

            <Button
              data-testid="button-save-template"
              className="w-full"
              onClick={() => {
                if (!name.trim()) return;
                createTemplate.mutate({
                  name: name.trim(),
                  isSystem: false,
                  createdByUserId: userId,
                  exerciseIds: JSON.stringify(selectedExerciseIds),
                });
              }}
              disabled={createTemplate.isPending || !name.trim()}
            >
              {t("templates.createBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise picker dialog */}
      <Dialog open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>{lang === "ru" ? "Выбрать упражнения" : "Select Exercises"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={lang === "ru" ? "Поиск..." : "Search..."}
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                className="pl-8 bg-background border-border"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map((ex: any) => {
                const selected = selectedExerciseIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExercise(ex.id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? "bg-primary/15 border border-primary/40"
                        : "bg-background border border-border hover:bg-muted/50"
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
              })}
            </div>
            <Button
              className="w-full"
              onClick={() => setShowExercisePicker(false)}
            >
              {lang === "ru" ? `Готово (${selectedExerciseIds.length})` : `Done (${selectedExerciseIds.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

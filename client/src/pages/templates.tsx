import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Dumbbell, ChevronRight, LayoutTemplate } from "lucide-react";
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
  const [name, setName] = useState("");
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
    },
  });

  const getExerciseNames = (tpl: any) => {
    const ids: number[] = JSON.parse(tpl?.exerciseIds ?? "[]");
    return ids.map(id => exercises?.find((ex: any) => ex.id === id)?.name ?? "").filter(Boolean);
  };

  const weekdayNames = lang === "ru"
    ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t("templates.title", lang)}</h1>
        <Button size="sm" className="rounded-xl gap-1" onClick={() => setShowCreate(true)}>
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
                    {exNames.slice(0, 3).join(", ")}{exNames.length > 3 ? ` +${exNames.length - 3}` : ""}
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
          <DialogHeader><DialogTitle>{selectedTemplate?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5 mt-2">
            {getExerciseNames(selectedTemplate ?? {}).map((name: string, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg p-2.5">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Dumbbell size={12} className="text-primary" />
                </div>
                <span className="text-sm">{name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create template */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{t("templates.createTitle", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="input-template-name" placeholder={t("templates.namePlaceholder", lang)}
              value={name} onChange={e => setName(e.target.value)} className="bg-background border-border" />
            <p className="text-muted-foreground text-xs">{t("templates.createHint", lang)}</p>
            <Button data-testid="button-save-template" className="w-full"
              onClick={() => {
                if (!name.trim()) return;
                createTemplate.mutate({ name: name.trim(), isSystem: false, createdByUserId: userId, exerciseIds: "[]" });
              }}
              disabled={createTemplate.isPending || !name.trim()}>
              {t("templates.createBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

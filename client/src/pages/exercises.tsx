import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { exerciseNameRu } from "@/lib/exerciseNames";

const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
const equipmentList = ["barbell", "dumbbell", "machine", "bodyweight", "cables"];

const muscleColors: Record<string, string> = {
  chest: "text-red-400 bg-red-400/10",
  back: "text-blue-400 bg-blue-400/10",
  legs: "text-green-400 bg-green-400/10",
  shoulders: "text-yellow-400 bg-yellow-400/10",
  arms: "text-purple-400 bg-purple-400/10",
  core: "text-orange-400 bg-orange-400/10",
};

export default function ExercisesPage() {
  const { userId } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", muscleGroup: "chest", equipment: "barbell" });

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["/api/exercises", muscleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (muscleFilter !== "all") params.set("muscleGroup", muscleFilter);
      return apiRequest("GET", `/api/exercises?${params}`).then(r => r.json());
    },
  });

  const createExercise = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/exercises", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      setShowCreate(false);
      setForm({ name: "", muscleGroup: "chest", equipment: "barbell" });
      toast({ title: t("exercises.created", lang) });
    },
  });

  const filtered = exercises?.filter((ex: any) =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const muscleLabel = (mg: string) => t(`exercises.muscles.${mg}` as any, lang) || mg;
  const equipLabel = (eq: string) => t(`exercises.equip.${eq}` as any, lang) || eq;

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t("exercises.title", lang)}</h1>
        <Button data-testid="button-create-exercise" size="sm" className="rounded-xl gap-1" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t("exercises.customBtn", lang)}
        </Button>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="input-exercise-search" placeholder={t("exercises.searchPlaceholder", lang)}
          value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-card border-card-border" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setMuscleFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${muscleFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
          {t("exercises.all", lang)}
        </button>
        {muscleGroups.map(mg => (
          <button key={mg} onClick={() => setMuscleFilter(muscleFilter === mg ? "all" : mg)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0 ${muscleFilter === mg ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            {muscleLabel(mg)}
          </button>
        ))}
      </div>

      <div className="text-muted-foreground text-xs mb-3">{filtered.length} {t("exercises.count", lang)}</div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((ex: any) => (
            <div key={ex.id} data-testid={`exercise-item-${ex.id}`}
              className="bg-card border border-card-border rounded-xl p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${muscleColors[ex.muscleGroup] ?? "bg-muted text-muted-foreground"}`}>
                <span className="text-[10px] font-bold uppercase">{ex.muscleGroup.substring(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {lang === "ru" ? (exerciseNameRu[ex.name] ?? ex.name) : ex.name}
                </div>
                <div className="text-muted-foreground text-xs">{equipLabel(ex.equipment)}</div>
              </div>
              {ex.isCustom && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                  {t("exercises.custom", lang)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{t("exercises.createTitle", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input data-testid="input-ex-name" placeholder={t("exercises.namePlaceholder", lang)}
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-background border-border" />
            <Select value={form.muscleGroup} onValueChange={v => setForm(f => ({ ...f, muscleGroup: v }))}>
              <SelectTrigger data-testid="select-muscle-group" className="bg-background border-border">
                <SelectValue placeholder={t("exercises.muscleGroup", lang)} />
              </SelectTrigger>
              <SelectContent>
                {muscleGroups.map(mg => (
                  <SelectItem key={mg} value={mg}>{muscleLabel(mg)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.equipment} onValueChange={v => setForm(f => ({ ...f, equipment: v }))}>
              <SelectTrigger data-testid="select-equipment" className="bg-background border-border">
                <SelectValue placeholder={t("exercises.equipment", lang)} />
              </SelectTrigger>
              <SelectContent>
                {equipmentList.map(eq => (
                  <SelectItem key={eq} value={eq}>{equipLabel(eq)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button data-testid="button-save-exercise" className="w-full"
              onClick={() => {
                if (!form.name.trim()) return;
                createExercise.mutate({ ...form, isCustom: true, createdByUserId: userId });
              }}
              disabled={createExercise.isPending || !form.name.trim()}>
              {createExercise.isPending ? t("exercises.creating", lang) : t("exercises.createBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

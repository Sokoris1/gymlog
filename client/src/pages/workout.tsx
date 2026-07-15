import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Dumbbell, ChevronRight, Clock, Calendar, LayoutTemplate, Settings2, Repeat } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { setActiveWorkout } from "@/lib/store";

export default function WorkoutPage() {
  const { userId } = useAuth();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [, navigate] = useLocation();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState("");

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["/api/workouts", userId],
    queryFn: () => apiRequest("GET", `/api/workouts/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: () => apiRequest("GET", `/api/templates`).then(r => r.json()),
  });

  const createWorkout = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/workouts", data).then(r => r.json()),
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      setActiveWorkout(workout.id, userId);
      navigate(`/workout/active/${workout.id}`);
    },
  });

  const startBlank = () => {
    const title = workoutTitle.trim() || (lang === "ru" ? "Тренировка" : "Workout");
    createWorkout.mutate({
      userId,
      title,
      date: new Date().toISOString().split("T")[0],
      startTime: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    });
    setShowNewDialog(false);
  };

  const startFromTemplate = async (template: any) => {
    const workout = await apiRequest("POST", "/api/workouts", {
      userId,
      title: template.name,
      date: new Date().toISOString().split("T")[0],
      startTime: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      templateId: template.id,
    }).then(r => r.json());

    const exerciseIds = JSON.parse(template.exerciseIds ?? "[]");
    for (let i = 0; i < exerciseIds.length; i++) {
      await apiRequest("POST", "/api/workout-exercises", {
        workoutId: workout.id, exerciseId: exerciseIds[i], order: i,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
    setActiveWorkout(workout.id, userId);
    navigate(`/workout/active/${workout.id}`);
    setShowTemplates(false);
  };

  const repeatWorkout = useMutation({
    mutationFn: (sourceId: number) =>
      apiRequest("POST", `/api/workout/${sourceId}/repeat`, {
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      }).then(r => r.json()),
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts", userId] });
      setActiveWorkout(workout.id, userId);
      navigate(`/workout/active/${workout.id}`);
    },
  });

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t("workout.title", lang)}</h1>
        <Button data-testid="button-new-workout" size="sm" className="rounded-xl gap-1" onClick={() => setShowNewDialog(true)}>
          <Plus size={16} /> {t("workout.newBtn", lang)}
        </Button>
      </div>

      {/* Start buttons */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button data-testid="button-start-blank" onClick={() => setShowNewDialog(true)}
          className="bg-primary text-primary-foreground rounded-2xl p-4 text-left hover-elevate active-elevate">
          <Plus size={20} className="mb-2" />
          <div className="font-semibold text-sm">{t("workout.blankWorkout", lang)}</div>
          <div className="text-primary-foreground/70 text-xs mt-0.5">{t("workout.blankSub", lang)}</div>
        </button>
        <button data-testid="button-from-template" onClick={() => setShowTemplates(true)}
          className="bg-card border border-card-border rounded-2xl p-4 text-left hover-elevate active-elevate">
          <LayoutTemplate size={20} className="mb-2 text-primary" />
          <div className="font-semibold text-sm">{t("workout.fromTemplate", lang)}</div>
          <div className="text-muted-foreground text-xs mt-0.5">{templates?.length ?? 0} {t("workout.available", lang)}</div>
        </button>
      </div>

      {/* Manage templates button */}
      <button
        onClick={() => navigate("/templates")}
        className="w-full flex items-center gap-2 px-4 py-2.5 mb-6 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-card transition-colors"
      >
        <Settings2 size={15} />
        <span>{lang === "ru" ? "Управление шаблонами" : "Manage templates"}</span>
        <ChevronRight size={14} className="ml-auto" />
      </button>

      {/* History */}
      <div>
        <h2 className="font-semibold text-base mb-3">{t("workout.history", lang)}</h2>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-18 w-full rounded-xl" />)}</div>
        ) : (workouts?.length ?? 0) === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <Dumbbell size={28} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("workout.noHistory", lang)}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("workout.noHistorySub", lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map((w: any) => (
              <div key={w.id} data-testid={`history-workout-${w.id}`}
                onClick={() => navigate(`/workout/${w.id}`)}
                className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover-elevate active-elevate">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{w.title}</div>
                  <div className="text-muted-foreground text-xs flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {format(parseISO(w.date + "T00:00:00"), "EEEE, d MMM", { locale })}
                    </span>
                    {w.durationMinutes && (
                      <span className="flex items-center gap-1"><Clock size={10} />{w.durationMinutes}м</span>
                    )}
                  </div>
                </div>
                <button
                  data-testid={`button-repeat-workout-${w.id}`}
                  onClick={e => { e.stopPropagation(); repeatWorkout.mutate(w.id); }}
                  disabled={repeatWorkout.isPending}
                  className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors flex-shrink-0 disabled:opacity-50"
                  title={lang === "ru" ? "Повторить тренировку" : "Repeat workout"}
                  aria-label={lang === "ru" ? "Повторить тренировку" : "Repeat workout"}>
                  <Repeat size={15} />
                </button>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New workout dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-card border-card-border top-[20%] translate-y-0">
          <DialogHeader><DialogTitle>{t("workout.dialogTitle", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              data-testid="input-workout-title"
              placeholder={t("workout.titlePlaceholder", lang)}
              value={workoutTitle}
              onChange={e => setWorkoutTitle(e.target.value)}
              className="bg-background border-border"
              onKeyDown={e => e.key === "Enter" && startBlank()}
            />
            <Button data-testid="button-confirm-start" className="w-full" onClick={startBlank}
              disabled={createWorkout.isPending}>
              {createWorkout.isPending ? t("workout.starting", lang) : t("workout.startBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{t("workout.chooseTemplate", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            {templates?.map((tpl: any) => (
              <button key={tpl.id} data-testid={`template-item-${tpl.id}`}
                onClick={() => startFromTemplate(tpl)}
                className="w-full bg-background border border-border rounded-xl p-3 flex items-center gap-3 hover-elevate text-left">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={16} className="text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{tpl.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {JSON.parse(tpl.exerciseIds ?? "[]").length} {t("workout.exercises", lang)}
                    {tpl.isSystem && ` · ${t("workout.system", lang)}`}
                  </div>
                </div>
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

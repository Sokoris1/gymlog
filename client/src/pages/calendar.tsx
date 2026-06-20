import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function CalendarPage() {
  const { userId, user } = useAuth();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", description: "", scheduledAt: "", location: "" });

  const { data: workouts } = useQuery({
    queryKey: ["/api/workouts", userId],
    queryFn: () => apiRequest("GET", `/api/workouts/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: events } = useQuery({
    queryKey: ["/api/events", userId],
    queryFn: () => apiRequest("GET", `/api/events/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
    queryFn: () => apiRequest("GET", "/api/programs").then(r => r.json()),
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: () => apiRequest("GET", "/api/templates").then(r => r.json()),
  });

  // Only the user's chosen (active) program drives the calendar.
  const activeProgramId = user?.activeProgramId ?? null;
  const activeProgram = (programs ?? []).find((p: any) => p.id === activeProgramId) ?? null;

  // weekday (0-6) → list of planned trainings { program, label }
  const plannedByWeekday: Record<number, { program: string; label: string }[]> = {};
  if (activeProgram) {
    const days = JSON.parse(activeProgram.days ?? "[]");
    days.forEach((d: any) => {
      if (d.templateId == null) return;
      const tpl = templates?.find((tp: any) => tp.id === d.templateId);
      const label = tpl?.name ?? d.label ?? "";
      (plannedByWeekday[d.weekday] ??= []).push({ program: activeProgram.name, label });
    });
  }
  const hasPlanned = (d: Date) => (plannedByWeekday[d.getDay()]?.length ?? 0) > 0;

  const createEvent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/events", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", userId] });
      setShowCreateEvent(false);
      setEventForm({ title: "", description: "", scheduledAt: "", location: "" });
      toast({ title: t("calendar.created", lang) });
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) });
  const startDow = monthStart.getDay();

  const workoutDates = new Set(workouts?.map((w: any) => w.date) ?? []);
  const eventDates = new Set(events?.map((e: any) => e.scheduledAt?.split("T")[0]) ?? []);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedWorkouts = workouts?.filter((w: any) => w.date === selectedDateStr) ?? [];
  const selectedEvents = events?.filter((e: any) => e.scheduledAt?.startsWith(selectedDateStr ?? "!!!")) ?? [];

  const dayHeaders = lang === "ru"
    ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="min-h-screen px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t("calendar.title", lang)}</h1>
        <Button data-testid="button-create-event" size="sm" className="rounded-xl gap-1" onClick={() => setShowCreateEvent(true)}>
          <Plus size={16} /> {t("calendar.eventBtn", lang)}
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button data-testid="button-prev-month"
          onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold capitalize">{format(currentMonth, "LLLL yyyy", { locale })}</span>
        <button data-testid="button-next-month"
          onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-muted-foreground text-xs font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const hasWorkout = workoutDates.has(dayStr);
          const hasEvent = eventDates.has(dayStr);
          const planned = hasPlanned(day) && !hasWorkout;
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isToday(day);
          return (
            <button key={dayStr} data-testid={`calendar-day-${dayStr}`}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium relative transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" :
                today ? "bg-primary/10 text-primary" : "hover:bg-card"
              }`}>
              {day.getDate()}
              <div className="flex gap-0.5 absolute bottom-1">
                {hasWorkout && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />}
                {hasEvent && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-chart-2"}`} />}
                {planned && <div className={`w-1 h-1 rounded-full border ${isSelected ? "border-primary-foreground" : "border-primary"}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected date */}
      {selectedDate && (
        <div className="mb-5">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground capitalize">
            {format(selectedDate, "EEEE, d MMMM", { locale })}
          </h2>
          {(() => {
            const planned = plannedByWeekday[selectedDate.getDay()] ?? [];
            const dayHasWorkout = workoutDates.has(selectedDateStr ?? "");
            if (planned.length === 0 || dayHasWorkout) return null;
            return planned.map((pl, i) => (
              <div key={`planned-${i}`} className="bg-card border border-dashed border-primary/40 rounded-xl p-3 flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full border border-primary flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{pl.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {lang === "ru" ? "По программе" : "Planned"} · {pl.program}
                  </div>
                </div>
              </div>
            ));
          })()}
          {selectedWorkouts.length === 0 && selectedEvents.length === 0 &&
            (plannedByWeekday[selectedDate.getDay()]?.length ?? 0) === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">{t("calendar.noActivity", lang)}</div>
          )}
          {selectedWorkouts.map((w: any) => (
            <div key={w.id} className="bg-card border border-card-border rounded-xl p-3 flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">{w.title}</div>
                {w.durationMinutes && <div className="text-muted-foreground text-xs">{w.durationMinutes} мин</div>}
              </div>
            </div>
          ))}
          {selectedEvents.map((e: any) => (
            <div key={e.id} className="bg-card border border-card-border rounded-xl p-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-chart-2 flex-shrink-0" />
                <div className="font-medium text-sm">{e.title}</div>
              </div>
              {e.location && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1 pl-4">
                  <MapPin size={10} /> {e.location}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming events */}
      {(events?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold text-base mb-3">{t("calendar.upcoming", lang)}</h2>
          <div className="space-y-2">
            {events.slice(0, 5).map((e: any) => (
              <div key={e.id} data-testid={`event-item-${e.id}`} className="bg-card border border-card-border rounded-2xl p-3">
                <div className="font-medium text-sm">{e.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {format(parseISO(e.scheduledAt), "d MMM, HH:mm", { locale })}
                  </span>
                  {e.location && (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <MapPin size={10} /> {e.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>{t("calendar.createTitle", lang)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="input-event-title" placeholder={t("calendar.eventTitle", lang)}
              value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
              className="bg-background border-border" />
            <Input data-testid="input-event-datetime" type="datetime-local"
              value={eventForm.scheduledAt} onChange={e => setEventForm(f => ({ ...f, scheduledAt: e.target.value }))}
              className="bg-background border-border" />
            <Input data-testid="input-event-location" placeholder={t("calendar.location", lang)}
              value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
              className="bg-background border-border" />
            <Input data-testid="input-event-description" placeholder={t("calendar.description", lang)}
              value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
              className="bg-background border-border" />
            <Button data-testid="button-save-event" className="w-full"
              onClick={() => {
                if (!eventForm.title || !eventForm.scheduledAt) return;
                createEvent.mutate({
                  creatorId: userId, title: eventForm.title,
                  scheduledAt: new Date(eventForm.scheduledAt).toISOString(),
                  location: eventForm.location || null,
                  description: eventForm.description || null,
                });
              }}
              disabled={createEvent.isPending || !eventForm.title || !eventForm.scheduledAt}>
              {createEvent.isPending ? t("calendar.creating", lang) : t("calendar.createBtn", lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp } from "lucide-react";
import { useAuth, useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProgressPage() {
  const { userId } = useAuth();
  const { lang } = useLang();
  const locale = lang === "ru" ? dateFnsRu : undefined;
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState("");

  const { data: prs, isLoading: prsLoading } = useQuery({
    queryKey: ["/api/prs", userId],
    queryFn: () => apiRequest("GET", `/api/prs/${userId}`).then(r => r.json()),
    enabled: !!userId,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/exercises", selectedExerciseId, "progress", userId],
    queryFn: () => apiRequest("GET", `/api/exercises/${selectedExerciseId}/progress/${userId}`).then(r => r.json()),
    enabled: !!selectedExerciseId && !!userId,
  });

  const muscleGroupColors: Record<string, string> = {
    chest: "text-red-400", back: "text-blue-400", legs: "text-green-400",
    shoulders: "text-yellow-400", arms: "text-purple-400", core: "text-orange-400",
  };

  return (
    <div className="min-h-screen px-4 pt-6">
      <h1 className="text-xl font-bold mb-6">{t("progress.title", lang)}</h1>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="font-semibold text-base">{t("progress.prs", lang)}</h2>
          <span className="text-muted-foreground text-xs ml-auto">{prs?.length ?? 0} {t("progress.total", lang)}</span>
        </div>

        {prsLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : (prs?.length ?? 0) === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-6 text-center">
            <Trophy size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">{t("progress.noPRs", lang)}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("progress.noPRsSub", lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prs.map((pr: any) => (
              <button key={pr.id} data-testid={`pr-item-${pr.id}`}
                onClick={() => { setSelectedExerciseId(pr.exerciseId); setSelectedExerciseName(pr.exercise?.name ?? ""); }}
                className="w-full bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3 hover-elevate text-left">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{pr.exercise?.name ?? "Exercise"}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-primary font-semibold text-sm">{pr.weight}кг × {pr.reps}</span>
                    <span className={`text-xs ${muscleGroupColors[pr.exercise?.muscleGroup] ?? "text-muted-foreground"}`}>
                      {t(`exercises.muscles.${pr.exercise?.muscleGroup}` as any, lang)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(pr.date + "T00:00:00"), "d MMM", { locale })}
                  </div>
                  <TrendingUp size={12} className="ml-auto mt-0.5 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedExerciseId} onOpenChange={open => { if (!open) setSelectedExerciseId(null); }}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              {selectedExerciseName}
            </DialogTitle>
          </DialogHeader>
          {progressLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (progressData?.length ?? 0) === 0 ? (
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
                    formatter={(v: any) => [`${v} кг`, lang === "ru" ? "Вес" : "Weight"]}
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
  );
}

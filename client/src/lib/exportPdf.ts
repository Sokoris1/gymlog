import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ru as dateFnsRu } from "date-fns/locale";

interface SetData {
  setNumber: number;
  weight: number | string;
  reps: number | string;
}

interface ExerciseData {
  exercise?: { name?: string };
  sets?: SetData[];
}

interface WorkoutFull {
  id: number;
  name?: string;
  startTime?: string;
  endTime?: string;
  exercises?: ExerciseData[];
}

interface PR {
  exercise?: { name?: string };
  weight: number | string;
  reps: number | string;
  achievedAt?: string;
  date?: string;
}

interface Stats {
  totalWorkouts?: number;
  totalVolume?: number;
  totalPRs?: number;
}

function durationMinutes(start?: string, end?: string): string {
  if (!start || !end) return "—";
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${mins} мин`;
}

export async function exportWorkoutsPdf(
  userId: number,
  username: string,
  lang: "ru" | "en",
  apiRequest: (method: string, url: string) => Promise<Response>
) {
  const locale = lang === "ru" ? dateFnsRu : undefined;

  // 1. Fetch list of workouts, PRs, stats in parallel
  const [workoutsListRes, prsRes, statsRes] = await Promise.all([
    apiRequest("GET", `/api/workouts/${userId}`).then(r => r.json()),
    apiRequest("GET", `/api/prs/${userId}`).then(r => r.json()),
    apiRequest("GET", `/api/users/${userId}/stats`).then(r => r.json()),
  ]);

  const workoutsList: { id: number }[] = Array.isArray(workoutsListRes) ? workoutsListRes : [];
  const prs: PR[] = Array.isArray(prsRes) ? prsRes : [];
  const stats: Stats = statsRes ?? {};

  // 2. Fetch full workout detail (with exercises + sets) for each workout
  const workouts: WorkoutFull[] = await Promise.all(
    workoutsList.map(w =>
      apiRequest("GET", `/api/workout/${w.id}`).then(r => r.json())
    )
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;
  const COL = W - MARGIN * 2;
  let y = MARGIN;

  const addPage = () => { doc.addPage(); y = MARGIN; };
  const checkY = (needed: number) => { if (y + needed > 280) addPage(); };

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(lang === "ru" ? "GymLog — История тренировок" : "GymLog — Workout History", MARGIN, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const exportDate = format(new Date(), "d MMMM yyyy", { locale });
  doc.text(`@${username}  •  ${exportDate}`, W - MARGIN, 14, { align: "right" });
  y = 30;

  // ── Stats summary ────────────────────────────────────────────────────
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const statItems = [
    lang === "ru" ? `Тренировок: ${stats.totalWorkouts ?? 0}` : `Workouts: ${stats.totalWorkouts ?? 0}`,
    lang === "ru" ? `Тоннаж: ${(stats.totalVolume ?? 0).toLocaleString()} кг` : `Volume: ${(stats.totalVolume ?? 0).toLocaleString()} kg`,
    lang === "ru" ? `Рекордов: ${stats.totalPRs ?? 0}` : `PRs: ${stats.totalPRs ?? 0}`,
  ];
  doc.text(statItems.join("     "), MARGIN, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 6;

  // ── Workouts ─────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(lang === "ru" ? "Тренировки" : "Workouts", MARGIN, y);
  y += 7;

  if (workouts.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(lang === "ru" ? "Нет тренировок" : "No workouts yet", MARGIN, y);
    y += 8;
  }

  for (const w of workouts) {
    checkY(20);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(MARGIN, y, COL, 9, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 83, 45);
    const wDate = w.startTime ? format(parseISO(w.startTime), "d MMM yyyy", { locale }) : "—";
    const wTitle = w.name ?? (lang === "ru" ? "Тренировка" : "Workout");
    doc.text(`${wDate}  •  ${wTitle}`, MARGIN + 3, y + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(durationMinutes(w.startTime, w.endTime), W - MARGIN - 2, y + 6, { align: "right" });
    y += 12;

    const exercises = w.exercises ?? [];
    if (exercises.length === 0) {
      checkY(6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text(lang === "ru" ? "  Нет упражнений" : "  No exercises", MARGIN + 3, y);
      y += 6;
      continue;
    }

    for (const ex of exercises) {
      checkY(14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(ex.exercise?.name ?? (lang === "ru" ? "Упражнение" : "Exercise"), MARGIN + 3, y);
      y += 4;

      const rows = (ex.sets ?? []).map((s) => [
        String(s.setNumber),
        `${s.weight} кг`,
        String(s.reps),
      ]);

      if (rows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [[
            lang === "ru" ? "Подход" : "Set",
            lang === "ru" ? "Вес" : "Weight",
            lang === "ru" ? "Повторения" : "Reps",
          ]],
          body: rows,
          margin: { left: MARGIN + 3, right: MARGIN },
          styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          tableWidth: COL - 3,
          theme: "striped",
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      } else {
        y += 4;
      }
    }
    y += 3;
  }

  // ── PRs ──────────────────────────────────────────────────────────────
  checkY(20);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 6;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(lang === "ru" ? "Личные рекорды" : "Personal Records", MARGIN, y);
  y += 7;

  if (prs.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(lang === "ru" ? "Нет рекордов" : "No records yet", MARGIN, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [[
        lang === "ru" ? "Упражнение" : "Exercise",
        lang === "ru" ? "Вес" : "Weight",
        lang === "ru" ? "Повторения" : "Reps",
        lang === "ru" ? "Дата" : "Date",
      ]],
      body: prs.map(p => {
        const dateStr = p.achievedAt ?? p.date;
        return [
          p.exercise?.name ?? "—",
          `${p.weight} кг`,
          String(p.reps),
          dateStr ? format(parseISO(dateStr), "d MMM yyyy", { locale }) : "—",
        ];
      }),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 9, cellPadding: 2, textColor: [40, 40, 40] },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      tableWidth: COL,
      theme: "striped",
    });
  }

  // ── Footer on each page ───────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(
      `GymLog  •  ${lang === "ru" ? "стр." : "p."} ${i} / ${totalPages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  const fileName = `gymlog_${username}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

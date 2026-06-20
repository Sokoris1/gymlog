import { storage } from "./storage";
import { sendPushToUser, isPushConfigured } from "./push";

/**
 * Current date + time as seen in a given IANA timezone.
 * Returns { date: "YYYY-MM-DD", minutes: number, weekday: 0-6 (0=Sun) }.
 */
function nowInTz(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some engines emit "24" for midnight
  const minutes = hour * 60 + parseInt(get("minute"), 10);
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wdMap[get("weekday")] ?? new Date().getDay();
  return { date, minutes, weekday };
}

function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function daysBetween(fromISODate: string, toISODate: string): number {
  const a = new Date(fromISODate + "T00:00:00Z").getTime();
  const b = new Date(toISODate + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86_400_000);
}

export interface RunResult {
  checked: number;
  scheduleSent: number;
  inactivitySent: number;
  skipped: number;
}

/**
 * Evaluate every reminder-enabled user and send due reminders.
 * Deduplicated to at most one reminder per user per local day via
 * users.push_last_reminder_date. Designed to be called every ~15 min by an
 * external cron; a reminder fires the first time the cron runs at/after the
 * user's chosen time on a matching day.
 */
export async function runScheduledPush(): Promise<RunResult> {
  const result: RunResult = { checked: 0, scheduleSent: 0, inactivitySent: 0, skipped: 0 };
  if (!isPushConfigured()) return result;

  const users = await storage.getUsersWithReminders();
  result.checked = users.length;

  for (const u of users) {
    try {
      const tz = u.pushTz || "UTC";
      const { date, minutes, weekday } = nowInTz(tz);

      // One reminder per user per local day.
      if (u.pushLastReminderDate === date) { result.skipped++; continue; }

      // ── Scheduled reminder
      const reminderMin = parseHHMM(u.pushReminderTime);
      const days = (u.pushReminderDays ?? "").split(",").map(s => s.trim()).filter(Boolean).map(Number);
      const scheduleDue =
        reminderMin != null &&
        days.includes(weekday) &&
        minutes >= reminderMin;

      // ── Inactivity reminder
      let inactivityDue = false;
      if ((u.pushInactivityDays ?? 0) > 0) {
        const workouts = await storage.getWorkouts(u.id);
        const lastDate = workouts[0]?.date; // newest-first
        const idle = lastDate ? daysBetween(lastDate, date) : Number.MAX_SAFE_INTEGER;
        if (idle >= (u.pushInactivityDays ?? 0)) inactivityDue = true;
      }

      if (!scheduleDue && !inactivityDue) { result.skipped++; continue; }

      const body = scheduleDue
        ? "Time to train 💪"
        : "You haven't trained in a while — let's get back to it!";
      const sent = await sendPushToUser(u.id, { title: "GymLog", body, url: "/#/" });

      if (sent > 0) {
        await storage.updateUser(u.id, { pushLastReminderDate: date });
        if (scheduleDue) result.scheduleSent++; else result.inactivitySent++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      console.error("[push] runScheduledPush user", u.id, err);
      result.skipped++;
    }
  }

  return result;
}

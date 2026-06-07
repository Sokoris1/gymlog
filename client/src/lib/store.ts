// Active workout persisted in localStorage so navigation doesn't lose it
const STORAGE_KEY = "__gymlog_active_workout__";

export function setActiveWorkout(id: number | null) {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, startTime: new Date().toISOString() }));
  }
}

export function getActiveWorkout(): { id: number | null; startTime: Date | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { id: null, startTime: null };
    const parsed = JSON.parse(raw);
    return { id: parsed.id, startTime: parsed.startTime ? new Date(parsed.startTime) : null };
  } catch {
    return { id: null, startTime: null };
  }
}

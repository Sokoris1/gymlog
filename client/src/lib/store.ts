// Active workout persisted in localStorage so navigation doesn't lose it.
// Key is scoped by userId so switching accounts never leaks a workout.
const storageKey = (userId?: number | null) =>
  `__gymlog_active_workout__${userId ?? "anon"}`;

export function setActiveWorkout(id: number | null, userId?: number | null) {
  const key = storageKey(userId);
  if (id === null) {
    localStorage.removeItem(key);
    // Also clean up any legacy un-scoped key left from older sessions
    localStorage.removeItem("__gymlog_active_workout__");
  } else {
    localStorage.setItem(key, JSON.stringify({ id, startTime: new Date().toISOString() }));
  }
}

export function getActiveWorkout(userId?: number | null): { id: number | null; startTime: Date | null } {
  try {
    // Try scoped key first; fall back to legacy key only if userId is unknown
    const raw =
      localStorage.getItem(storageKey(userId)) ??
      (userId == null ? localStorage.getItem("__gymlog_active_workout__") : null);
    if (!raw) return { id: null, startTime: null };
    const parsed = JSON.parse(raw);
    return { id: parsed.id, startTime: parsed.startTime ? new Date(parsed.startTime) : null };
  } catch {
    return { id: null, startTime: null };
  }
}

// Call on logout to wipe this user's active workout entry.
export function clearActiveWorkout(userId?: number | null) {
  localStorage.removeItem(storageKey(userId));
  localStorage.removeItem("__gymlog_active_workout__");
}

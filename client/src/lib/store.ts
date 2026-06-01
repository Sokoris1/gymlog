// Simple global state using React context - no localStorage (blocked in sandbox)
export const APP_USER_KEY = "__gymlog_user__";

// Active workout state - stored in module-level variable (session only)
let activeWorkoutId: number | null = null;
let activeWorkoutStartTime: Date | null = null;

export function setActiveWorkout(id: number | null) {
  activeWorkoutId = id;
  activeWorkoutStartTime = id ? new Date() : null;
}

export function getActiveWorkout() {
  return { id: activeWorkoutId, startTime: activeWorkoutStartTime };
}

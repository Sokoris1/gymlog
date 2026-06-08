import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

export async function seedDatabase() {
  // ─── Admin account (always ensure exists) ────────────────────────────────
  const rawSql = neon(process.env.DATABASE_URL!);
  try {
    await rawSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false`;
  } catch (_) { /* already exists */ }

  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash("admin123", 10);
    await rawSql`INSERT INTO users (name, username, password_hash, is_admin, goal, created_at)
                 VALUES ('Admin', 'admin', ${adminHash}, true, 'general', NOW())`;
    console.log("Admin account created: login=admin, password=admin123");
  } else {
    await rawSql`UPDATE users SET is_admin = true WHERE username = 'admin'`;
  }

  const existingExercises = await storage.getExercises();
  if (existingExercises.length > 0) return; // Already seeded

  // ─── Exercises ────────────────────────────────────────────────────────────
  const exerciseData = [
    // Chest
    { name: "Barbell Bench Press", muscleGroup: "chest" as const, equipment: "barbell" as const },
    { name: "Incline Bench Press", muscleGroup: "chest" as const, equipment: "barbell" as const },
    { name: "Dumbbell Flyes", muscleGroup: "chest" as const, equipment: "dumbbell" as const },
    { name: "Cable Crossover", muscleGroup: "chest" as const, equipment: "cables" as const },
    { name: "Push-Up", muscleGroup: "chest" as const, equipment: "bodyweight" as const },
    { name: "Chest Press Machine", muscleGroup: "chest" as const, equipment: "machine" as const },
    { name: "Dumbbell Bench Press", muscleGroup: "chest" as const, equipment: "dumbbell" as const },
    { name: "Pec Deck", muscleGroup: "chest" as const, equipment: "machine" as const },
    // Back
    { name: "Barbell Deadlift", muscleGroup: "back" as const, equipment: "barbell" as const },
    { name: "Pull-Up", muscleGroup: "back" as const, equipment: "bodyweight" as const },
    { name: "Barbell Row", muscleGroup: "back" as const, equipment: "barbell" as const },
    { name: "Lat Pulldown", muscleGroup: "back" as const, equipment: "cables" as const },
    { name: "Seated Cable Row", muscleGroup: "back" as const, equipment: "cables" as const },
    { name: "Dumbbell Row", muscleGroup: "back" as const, equipment: "dumbbell" as const },
    { name: "T-Bar Row", muscleGroup: "back" as const, equipment: "barbell" as const },
    { name: "Chin-Up", muscleGroup: "back" as const, equipment: "bodyweight" as const },
    { name: "Face Pull", muscleGroup: "back" as const, equipment: "cables" as const },
    // Legs
    { name: "Barbell Squat", muscleGroup: "legs" as const, equipment: "barbell" as const },
    { name: "Romanian Deadlift", muscleGroup: "legs" as const, equipment: "barbell" as const },
    { name: "Leg Press", muscleGroup: "legs" as const, equipment: "machine" as const },
    { name: "Leg Extension", muscleGroup: "legs" as const, equipment: "machine" as const },
    { name: "Leg Curl", muscleGroup: "legs" as const, equipment: "machine" as const },
    { name: "Bulgarian Split Squat", muscleGroup: "legs" as const, equipment: "dumbbell" as const },
    { name: "Calf Raise", muscleGroup: "legs" as const, equipment: "machine" as const },
    { name: "Hack Squat", muscleGroup: "legs" as const, equipment: "machine" as const },
    { name: "Lunges", muscleGroup: "legs" as const, equipment: "dumbbell" as const },
    { name: "Goblet Squat", muscleGroup: "legs" as const, equipment: "dumbbell" as const },
    // Shoulders
    { name: "Overhead Press", muscleGroup: "shoulders" as const, equipment: "barbell" as const },
    { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders" as const, equipment: "dumbbell" as const },
    { name: "Lateral Raise", muscleGroup: "shoulders" as const, equipment: "dumbbell" as const },
    { name: "Front Raise", muscleGroup: "shoulders" as const, equipment: "dumbbell" as const },
    { name: "Rear Delt Fly", muscleGroup: "shoulders" as const, equipment: "dumbbell" as const },
    { name: "Arnold Press", muscleGroup: "shoulders" as const, equipment: "dumbbell" as const },
    { name: "Cable Lateral Raise", muscleGroup: "shoulders" as const, equipment: "cables" as const },
    // Arms
    { name: "Barbell Curl", muscleGroup: "arms" as const, equipment: "barbell" as const },
    { name: "Dumbbell Curl", muscleGroup: "arms" as const, equipment: "dumbbell" as const },
    { name: "Hammer Curl", muscleGroup: "arms" as const, equipment: "dumbbell" as const },
    { name: "Preacher Curl", muscleGroup: "arms" as const, equipment: "machine" as const },
    { name: "Tricep Pushdown", muscleGroup: "arms" as const, equipment: "cables" as const },
    { name: "Skull Crusher", muscleGroup: "arms" as const, equipment: "barbell" as const },
    { name: "Overhead Tricep Extension", muscleGroup: "arms" as const, equipment: "dumbbell" as const },
    { name: "Close-Grip Bench Press", muscleGroup: "arms" as const, equipment: "barbell" as const },
    { name: "Cable Curl", muscleGroup: "arms" as const, equipment: "cables" as const },
    // Core
    { name: "Plank", muscleGroup: "core" as const, equipment: "bodyweight" as const },
    { name: "Crunch", muscleGroup: "core" as const, equipment: "bodyweight" as const },
    { name: "Ab Wheel Rollout", muscleGroup: "core" as const, equipment: "bodyweight" as const },
    { name: "Hanging Leg Raise", muscleGroup: "core" as const, equipment: "bodyweight" as const },
    { name: "Cable Crunch", muscleGroup: "core" as const, equipment: "cables" as const },
    { name: "Russian Twist", muscleGroup: "core" as const, equipment: "dumbbell" as const },
    { name: "Dead Bug", muscleGroup: "core" as const, equipment: "bodyweight" as const },
    { name: "Landmine Rotation", muscleGroup: "core" as const, equipment: "barbell" as const },
  ];

  for (const ex of exerciseData) {
    await storage.createExercise({ ...ex, isCustom: false });
  }

  const allExercises = await storage.getExercises();
  const byName = (name: string) => allExercises.find(e => e.name === name)?.id ?? 1;

  // ─── Workout Templates ───────────────────────────────────────────────────
  const pushAExIds = [
    byName("Barbell Bench Press"), byName("Incline Bench Press"),
    byName("Overhead Press"), byName("Lateral Raise"),
    byName("Tricep Pushdown"), byName("Skull Crusher"),
  ];
  const pushA = await storage.createWorkoutTemplate({
    name: "Push A",
    isSystem: true,
    exerciseIds: JSON.stringify(pushAExIds),
  });

  const pullAExIds = [
    byName("Barbell Deadlift"), byName("Pull-Up"),
    byName("Seated Cable Row"), byName("Face Pull"),
    byName("Barbell Curl"), byName("Hammer Curl"),
  ];
  const pullA = await storage.createWorkoutTemplate({
    name: "Pull A",
    isSystem: true,
    exerciseIds: JSON.stringify(pullAExIds),
  });

  const legDayExIds = [
    byName("Barbell Squat"), byName("Romanian Deadlift"),
    byName("Leg Press"), byName("Leg Curl"),
    byName("Calf Raise"), byName("Lunges"),
  ];
  const legDay = await storage.createWorkoutTemplate({
    name: "Leg Day",
    isSystem: true,
    exerciseIds: JSON.stringify(legDayExIds),
  });

  const upperExIds = [
    byName("Barbell Bench Press"), byName("Barbell Row"),
    byName("Overhead Press"), byName("Lat Pulldown"),
    byName("Dumbbell Curl"), byName("Tricep Pushdown"),
  ];
  const upperBody = await storage.createWorkoutTemplate({
    name: "Upper Body",
    isSystem: true,
    exerciseIds: JSON.stringify(upperExIds),
  });

  // ─── Training Programs ───────────────────────────────────────────────────
  await storage.createTrainingProgram({
    name: "PPL 6-Week",
    durationWeeks: 6,
    isSystem: true,
    days: JSON.stringify([
      { weekday: 1, templateId: pushA.id, label: "Push A" },
      { weekday: 2, templateId: pullA.id, label: "Pull A" },
      { weekday: 3, templateId: legDay.id, label: "Legs" },
      { weekday: 4, templateId: null, label: "Rest" },
      { weekday: 5, templateId: pushA.id, label: "Push A" },
      { weekday: 6, templateId: pullA.id, label: "Pull A" },
      { weekday: 0, templateId: legDay.id, label: "Legs" },
    ]),
  });

  await storage.createTrainingProgram({
    name: "Upper/Lower Split",
    durationWeeks: 8,
    isSystem: true,
    days: JSON.stringify([
      { weekday: 1, templateId: upperBody.id, label: "Upper" },
      { weekday: 2, templateId: legDay.id, label: "Lower" },
      { weekday: 3, templateId: null, label: "Rest" },
      { weekday: 4, templateId: upperBody.id, label: "Upper" },
      { weekday: 5, templateId: legDay.id, label: "Lower" },
      { weekday: 6, templateId: null, label: "Rest" },
      { weekday: 0, templateId: null, label: "Rest" },
    ]),
  });

  // ─── Demo Users ──────────────────────────────────────────────────────────
  const user1 = await storage.createUser({
    name: "Alex Petrov",
    username: "alexp",
    goal: "strength",
    bodyWeight: 85,
    avatar: null,
  });

  const user2 = await storage.createUser({
    name: "Maria Volkova",
    username: "mvolkova",
    goal: "hypertrophy",
    bodyWeight: 62,
    avatar: null,
  });

  // ─── Sample Workouts ─────────────────────────────────────────────────────
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  const sampleWorkouts = [
    { title: "Push A", templateId: pushA.id, ago: 1, exerciseIds: pushAExIds },
    { title: "Pull A", templateId: pullA.id, ago: 3, exerciseIds: pullAExIds },
    { title: "Leg Day", templateId: legDay.id, ago: 5, exerciseIds: legDayExIds },
    { title: "Push A", templateId: pushA.id, ago: 8, exerciseIds: pushAExIds },
    { title: "Pull A", templateId: pullA.id, ago: 10, exerciseIds: pullAExIds },
    { title: "Upper Body", templateId: upperBody.id, ago: 14, exerciseIds: upperExIds },
  ];

  const setsData: Record<string, Array<{ weight: number; reps: number }>> = {
    "Barbell Bench Press": [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 95, reps: 6 }],
    "Incline Bench Press": [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 75, reps: 10 }],
    "Overhead Press": [{ weight: 65, reps: 6 }, { weight: 65, reps: 6 }, { weight: 60, reps: 8 }],
    "Lateral Raise": [{ weight: 15, reps: 15 }, { weight: 15, reps: 15 }, { weight: 15, reps: 12 }],
    "Tricep Pushdown": [{ weight: 50, reps: 12 }, { weight: 50, reps: 12 }, { weight: 45, reps: 15 }],
    "Skull Crusher": [{ weight: 40, reps: 10 }, { weight: 40, reps: 10 }, { weight: 35, reps: 12 }],
    "Barbell Deadlift": [{ weight: 140, reps: 5 }, { weight: 130, reps: 5 }, { weight: 120, reps: 6 }],
    "Pull-Up": [{ weight: 0, reps: 10 }, { weight: 0, reps: 9 }, { weight: 0, reps: 8 }],
    "Seated Cable Row": [{ weight: 70, reps: 10 }, { weight: 70, reps: 10 }, { weight: 65, reps: 12 }],
    "Face Pull": [{ weight: 30, reps: 15 }, { weight: 30, reps: 15 }, { weight: 30, reps: 15 }],
    "Barbell Curl": [{ weight: 45, reps: 10 }, { weight: 45, reps: 10 }, { weight: 40, reps: 12 }],
    "Hammer Curl": [{ weight: 20, reps: 12 }, { weight: 20, reps: 12 }, { weight: 18, reps: 15 }],
    "Barbell Squat": [{ weight: 120, reps: 5 }, { weight: 120, reps: 5 }, { weight: 110, reps: 6 }],
    "Romanian Deadlift": [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }, { weight: 90, reps: 10 }],
    "Leg Press": [{ weight: 180, reps: 12 }, { weight: 180, reps: 12 }, { weight: 160, reps: 15 }],
    "Leg Curl": [{ weight: 60, reps: 12 }, { weight: 60, reps: 12 }, { weight: 55, reps: 15 }],
    "Calf Raise": [{ weight: 80, reps: 15 }, { weight: 80, reps: 15 }, { weight: 80, reps: 15 }],
    "Lunges": [{ weight: 30, reps: 12 }, { weight: 30, reps: 12 }, { weight: 25, reps: 15 }],
    "Barbell Row": [{ weight: 90, reps: 8 }, { weight: 90, reps: 8 }, { weight: 80, reps: 10 }],
    "Lat Pulldown": [{ weight: 80, reps: 10 }, { weight: 80, reps: 10 }, { weight: 75, reps: 12 }],
    "Dumbbell Curl": [{ weight: 18, reps: 12 }, { weight: 18, reps: 12 }, { weight: 16, reps: 15 }],
  };

  for (const w of sampleWorkouts) {
    const workout = await storage.createWorkout({
      userId: user1.id,
      title: w.title,
      date: daysAgo(w.ago),
      startTime: "10:00",
      endTime: "11:15",
      durationMinutes: 75,
      templateId: w.templateId,
    });

    for (let i = 0; i < w.exerciseIds.length; i++) {
      const exId = w.exerciseIds[i];
      const we = await storage.createWorkoutExercise({ workoutId: workout.id, exerciseId: exId, order: i });
      const ex = allExercises.find(e => e.id === exId);
      const setsList = ex ? (setsData[ex.name] ?? [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }]) : [{ weight: 60, reps: 10 }];

      for (let j = 0; j < setsList.length; j++) {
        await storage.createSet({
          workoutExerciseId: we.id,
          setNumber: j + 1,
          weight: setsList[j].weight,
          reps: setsList[j].reps,
          isCompleted: true,
        });
      }
    }
  }

  // Compute PRs for user1
  const user1Workouts = await storage.getWorkouts(user1.id);
  for (const w of user1Workouts) {
    const wExs = await storage.getWorkoutExercises(w.id);
    for (const we of wExs) {
      const wSets = (await storage.getSets(we.id)).filter(s => s.isCompleted);
      for (const s of wSets) {
        await storage.upsertPersonalRecord({
          userId: user1.id,
          exerciseId: we.exerciseId,
          weight: s.weight,
          reps: s.reps,
          date: w.date,
        });
      }
    }
  }

  console.log("✅ Database seeded successfully");
}

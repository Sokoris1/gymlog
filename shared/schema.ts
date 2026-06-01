import { pgTable, text, integer, real, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  avatar: text("avatar"),
  bodyWeight: real("body_weight"),
  goal: text("goal", { enum: ["strength", "hypertrophy", "weight_loss", "general"] }).default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Friends ─────────────────────────────────────────────────────────────────
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  friendId: integer("friend_id").notNull(),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertFriendSchema = createInsertSchema(friends).omit({ id: true, createdAt: true });
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

// ─── Exercises ───────────────────────────────────────────────────────────────
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group", { enum: ["chest", "back", "legs", "shoulders", "arms", "core"] }).notNull(),
  equipment: text("equipment", { enum: ["barbell", "dumbbell", "machine", "bodyweight", "cables"] }).notNull(),
  isCustom: boolean("is_custom").default(false),
  createdByUserId: integer("created_by_user_id"),
});
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;

// ─── Workout Templates ───────────────────────────────────────────────────────
export const workoutTemplates = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isSystem: boolean("is_system").default(false),
  createdByUserId: integer("created_by_user_id"),
  exerciseIds: text("exercise_ids").notNull().default("[]"), // JSON array
});
export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplates).omit({ id: true });
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;

// ─── Training Programs ───────────────────────────────────────────────────────
export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  days: text("days").notNull().default("[]"), // JSON array of {weekday, templateId}
  isSystem: boolean("is_system").default(false),
  createdByUserId: integer("created_by_user_id"),
});
export const insertTrainingProgramSchema = createInsertSchema(trainingPrograms).omit({ id: true });
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramSchema>;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;

// ─── Workouts ─────────────────────────────────────────────────────────────────
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO date string
  startTime: text("start_time"),
  endTime: text("end_time"),
  notes: text("notes"),
  templateId: integer("template_id"),
  durationMinutes: integer("duration_minutes"),
});
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

// ─── Workout Exercises ───────────────────────────────────────────────────────
export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  order: integer("order").notNull().default(0),
});
export const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises).omit({ id: true });
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;

// ─── Sets ─────────────────────────────────────────────────────────────────────
export const sets = pgTable("sets", {
  id: serial("id").primaryKey(),
  workoutExerciseId: integer("workout_exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  rpe: real("rpe"),
  isCompleted: boolean("is_completed").default(false),
});
export const insertSetSchema = createInsertSchema(sets).omit({ id: true });
export type InsertSet = z.infer<typeof insertSetSchema>;
export type Set = typeof sets.$inferSelect;

// ─── Personal Records ────────────────────────────────────────────────────────
export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  date: text("date").notNull(),
});
export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({ id: true });
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
export type PersonalRecord = typeof personalRecords.$inferSelect;

// ─── Training Events ─────────────────────────────────────────────────────────
export const trainingEvents = pgTable("training_events", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: text("scheduled_at").notNull(),
  location: text("location"),
  templateId: integer("template_id"),
});
export const insertTrainingEventSchema = createInsertSchema(trainingEvents).omit({ id: true });
export type InsertTrainingEvent = z.infer<typeof insertTrainingEventSchema>;
export type TrainingEvent = typeof trainingEvents.$inferSelect;

// ─── Event Invites ───────────────────────────────────────────────────────────
export const eventInvites = pgTable("event_invites", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
});
export const insertEventInviteSchema = createInsertSchema(eventInvites).omit({ id: true });
export type InsertEventInvite = z.infer<typeof insertEventInviteSchema>;
export type EventInvite = typeof eventInvites.$inferSelect;

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ["event_invite", "event_reminder", "friend_request", "pr_achieved"] }).notNull(),
  payload: text("payload").notNull().default("{}"), // JSON
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

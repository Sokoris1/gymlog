import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";
import {
  users, exercises, workoutTemplates, trainingPrograms, workouts,
  workoutExercises, sets, personalRecords, trainingEvents, eventInvites,
  notifications, friends,
  type User, type InsertUser, type Exercise, type InsertExercise,
  type WorkoutTemplate, type InsertWorkoutTemplate,
  type TrainingProgram, type InsertTrainingProgram,
  type Workout, type InsertWorkout,
  type WorkoutExercise, type InsertWorkoutExercise,
  type Set, type InsertSet,
  type PersonalRecord, type InsertPersonalRecord,
  type TrainingEvent, type InsertTrainingEvent,
  type EventInvite, type InsertEventInvite,
  type Notification, type InsertNotification,
  type Friend, type InsertFriend,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsers(): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  // Friends
  getFriends(userId: number): Promise<Friend[]>;
  getIncomingRequests(userId: number): Promise<Friend[]>;
  getFriendship(userId: number, friendId: number): Promise<Friend | undefined>;
  getFriendshipById(id: number): Promise<Friend | undefined>;
  createFriendRequest(data: InsertFriend): Promise<Friend>;
  updateFriendStatus(id: number, status: Friend["status"]): Promise<Friend | undefined>;

  // Exercises
  getExercises(muscleGroup?: string, equipment?: string): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(data: InsertExercise): Promise<Exercise>;

  // Workout Templates
  getWorkoutTemplates(): Promise<WorkoutTemplate[]>;
  getWorkoutTemplate(id: number): Promise<WorkoutTemplate | undefined>;
  createWorkoutTemplate(data: InsertWorkoutTemplate): Promise<WorkoutTemplate>;
  updateWorkoutTemplate(id: number, data: Partial<InsertWorkoutTemplate>): Promise<WorkoutTemplate | undefined>;

  // Training Programs
  getTrainingPrograms(): Promise<TrainingProgram[]>;
  getTrainingProgram(id: number): Promise<TrainingProgram | undefined>;
  createTrainingProgram(data: InsertTrainingProgram): Promise<TrainingProgram>;

  // Workouts
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  createWorkout(data: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, data: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<void>;

  // Workout Exercises
  getWorkoutExercises(workoutId: number): Promise<WorkoutExercise[]>;
  getWorkoutExercise(id: number): Promise<WorkoutExercise | undefined>;
  createWorkoutExercise(data: InsertWorkoutExercise): Promise<WorkoutExercise>;
  deleteWorkoutExercise(id: number): Promise<void>;

  // Sets
  getSets(workoutExerciseId: number): Promise<Set[]>;
  getSet(id: number): Promise<Set | undefined>;
  createSet(data: InsertSet): Promise<Set>;
  updateSet(id: number, data: Partial<InsertSet>): Promise<Set | undefined>;
  deleteSet(id: number): Promise<void>;

  // Personal Records
  getPersonalRecords(userId: number): Promise<PersonalRecord[]>;
  getPersonalRecord(userId: number, exerciseId: number): Promise<PersonalRecord | undefined>;
  createPersonalRecord(data: InsertPersonalRecord): Promise<PersonalRecord>;
  deletePersonalRecord(id: number): Promise<void>;

  // Exercise progress (sets over time)
  getExerciseProgress(userId: number, exerciseId: number): Promise<Array<{ date: string; maxWeight: number; reps: number }>>;

  // Training Events
  getTrainingEvents(userId: number): Promise<TrainingEvent[]>;
  getTrainingEvent(id: number): Promise<TrainingEvent | undefined>;
  createTrainingEvent(data: InsertTrainingEvent): Promise<TrainingEvent>;

  // Event Invites
  getEventInvites(userId: number): Promise<EventInvite[]>;
  getEventInvite(id: number): Promise<EventInvite | undefined>;
  createEventInvite(data: InsertEventInvite): Promise<EventInvite>;
  updateEventInviteStatus(id: number, status: EventInvite["status"]): Promise<EventInvite | undefined>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadCount(userId: number): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllRead(userId: number): Promise<void>;
}

export const storage: IStorage = {
  // ─── Users ────────────────────────────────────────────────────────────────
  async getUser(id) {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  },
  async getAllUsers() {
    return db.select().from(users).orderBy(users.createdAt);
  },
  async getUserByUsername(username) {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  },
  async getUsers() {
    return db.select().from(users);
  },
  async createUser(data) {
    const rows = await db.insert(users).values(data).returning();
    return rows[0];
  },
  async updateUser(id, data) {
    const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  },
  async deleteUser(id) {
    const userWorkouts = await db.select().from(workouts).where(eq(workouts.userId, id));
    for (const w of userWorkouts) {
      const wExs = await db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, w.id));
      for (const we of wExs) {
        await db.delete(sets).where(eq(sets.workoutExerciseId, we.id));
      }
      await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, w.id));
    }
    await db.delete(workouts).where(eq(workouts.userId, id));
    await db.delete(personalRecords).where(eq(personalRecords.userId, id));
    await db.delete(friends).where(eq(friends.userId, id));
    await db.delete(friends).where(eq(friends.friendId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(eventInvites).where(eq(eventInvites.userId, id));
    await db.delete(trainingEvents).where(eq(trainingEvents.creatorId, id));
    await db.delete(users).where(eq(users.id, id));
  },

  // ─── Friends ──────────────────────────────────────────────────────────────
  async getFriends(userId) {
    return db.select().from(friends).where(eq(friends.userId, userId));
  },
  async getIncomingRequests(userId) {
    return db.select().from(friends)
      .where(and(eq(friends.friendId, userId), eq(friends.status, "pending")));
  },
  async getFriendship(userId, friendId) {
    const rows = await db.select().from(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
    return rows[0];
  },
  async getFriendshipById(id) {
    const rows = await db.select().from(friends).where(eq(friends.id, id));
    return rows[0];
  },
  async createFriendRequest(data) {
    const rows = await db.insert(friends).values(data).returning();
    return rows[0];
  },
  async updateFriendStatus(id, status) {
    const rows = await db.update(friends).set({ status }).where(eq(friends.id, id)).returning();
    return rows[0];
  },

  // ─── Exercises ────────────────────────────────────────────────────────────
  async getExercises(muscleGroup, equipment) {
    const conditions = [];
    if (muscleGroup) conditions.push(eq(exercises.muscleGroup, muscleGroup as any));
    if (equipment) conditions.push(eq(exercises.equipment, equipment as any));
    if (conditions.length > 0) {
      return db.select().from(exercises).where(and(...conditions));
    }
    return db.select().from(exercises);
  },
  async getExercise(id) {
    const rows = await db.select().from(exercises).where(eq(exercises.id, id));
    return rows[0];
  },
  async createExercise(data) {
    const rows = await db.insert(exercises).values(data).returning();
    return rows[0];
  },

  // ─── Workout Templates ───────────────────────────────────────────────────
  async getWorkoutTemplates() {
    return db.select().from(workoutTemplates);
  },
  async getWorkoutTemplate(id) {
    const rows = await db.select().from(workoutTemplates).where(eq(workoutTemplates.id, id));
    return rows[0];
  },
  async createWorkoutTemplate(data) {
    const rows = await db.insert(workoutTemplates).values(data).returning();
    return rows[0];
  },
  async updateWorkoutTemplate(id, data) {
    const rows = await db.update(workoutTemplates).set(data).where(eq(workoutTemplates.id, id)).returning();
    return rows[0];
  },

  // ─── Training Programs ───────────────────────────────────────────────────
  async getTrainingPrograms() {
    return db.select().from(trainingPrograms);
  },
  async getTrainingProgram(id) {
    const rows = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id));
    return rows[0];
  },
  async createTrainingProgram(data) {
    const rows = await db.insert(trainingPrograms).values(data).returning();
    return rows[0];
  },

  // ─── Workouts ─────────────────────────────────────────────────────────────
  async getWorkouts(userId) {
    return db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date));
  },
  async getWorkout(id) {
    const rows = await db.select().from(workouts).where(eq(workouts.id, id));
    return rows[0];
  },
  async createWorkout(data) {
    const rows = await db.insert(workouts).values(data).returning();
    return rows[0];
  },
  async updateWorkout(id, data) {
    const rows = await db.update(workouts).set(data).where(eq(workouts.id, id)).returning();
    return rows[0];
  },
  async deleteWorkout(id) {
    await db.delete(workouts).where(eq(workouts.id, id));
  },

  // ─── Workout Exercises ───────────────────────────────────────────────────
  async getWorkoutExercises(workoutId) {
    return db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId));
  },
  async getWorkoutExercise(id) {
    const rows = await db.select().from(workoutExercises).where(eq(workoutExercises.id, id));
    return rows[0];
  },
  async createWorkoutExercise(data) {
    const rows = await db.insert(workoutExercises).values(data).returning();
    return rows[0];
  },
  async deleteWorkoutExercise(id) {
    // Delete all sets belonging to this workout exercise first
    await db.delete(sets).where(eq(sets.workoutExerciseId, id));
    await db.delete(workoutExercises).where(eq(workoutExercises.id, id));
  },

  // ─── Sets ─────────────────────────────────────────────────────────────────
  async getSets(workoutExerciseId) {
    return db.select().from(sets).where(eq(sets.workoutExerciseId, workoutExerciseId));
  },
  async getSet(id) {
    const rows = await db.select().from(sets).where(eq(sets.id, id));
    return rows[0];
  },
  async createSet(data) {
    const rows = await db.insert(sets).values(data).returning();
    return rows[0];
  },
  async updateSet(id, data) {
    const rows = await db.update(sets).set(data).where(eq(sets.id, id)).returning();
    return rows[0];
  },
  async deleteSet(id) {
    await db.delete(sets).where(eq(sets.id, id));
  },

  // ─── Personal Records ────────────────────────────────────────────────────
  async getPersonalRecords(userId) {
    return db.select().from(personalRecords).where(eq(personalRecords.userId, userId));
  },
  async getPersonalRecord(userId, exerciseId) {
    const rows = await db.select().from(personalRecords)
      .where(and(eq(personalRecords.userId, userId), eq(personalRecords.exerciseId, exerciseId)));
    return rows[0];
  },
  async createPersonalRecord(data: InsertPersonalRecord) {
    const rows = await db.insert(personalRecords).values(data).returning();
    return rows[0];
  },
  async deletePersonalRecord(id: number) {
    await db.delete(personalRecords).where(eq(personalRecords.id, id));
  },

  // ─── Exercise Progress ───────────────────────────────────────────────────
  async getExerciseProgress(userId, exerciseId) {
    const rows = await sql`
      SELECT w.date, MAX(s.weight) as "maxWeight", s.reps
      FROM workouts w
      JOIN workout_exercises we ON we.workout_id = w.id
      JOIN sets s ON s.workout_exercise_id = we.id
      WHERE w.user_id = ${userId} AND we.exercise_id = ${exerciseId} AND s.is_completed = true
      GROUP BY w.date, s.reps
      ORDER BY w.date ASC
    `;
    return rows as Array<{ date: string; maxWeight: number; reps: number }>;
  },

  // ─── Training Events ─────────────────────────────────────────────────────
  async getTrainingEvents(userId) {
    const ownEvents = await db.select().from(trainingEvents).where(eq(trainingEvents.creatorId, userId));
    const invites = await db.select().from(eventInvites).where(eq(eventInvites.userId, userId));
    const invitedEventIds = invites.map(i => i.eventId);
    let invitedEvents: TrainingEvent[] = [];
    if (invitedEventIds.length > 0) {
      const allEvents = await db.select().from(trainingEvents);
      invitedEvents = allEvents.filter(e => invitedEventIds.includes(e.id));
    }
    const all = [...ownEvents, ...invitedEvents];
    return all.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
  },
  async getTrainingEvent(id) {
    const rows = await db.select().from(trainingEvents).where(eq(trainingEvents.id, id));
    return rows[0];
  },
  async createTrainingEvent(data) {
    const rows = await db.insert(trainingEvents).values(data).returning();
    return rows[0];
  },

  // ─── Event Invites ───────────────────────────────────────────────────────
  async getEventInvites(userId) {
    return db.select().from(eventInvites).where(eq(eventInvites.userId, userId));
  },
  async getEventInvite(id) {
    const rows = await db.select().from(eventInvites).where(eq(eventInvites.id, id));
    return rows[0];
  },
  async createEventInvite(data) {
    const rows = await db.insert(eventInvites).values(data).returning();
    return rows[0];
  },
  async updateEventInviteStatus(id, status) {
    const rows = await db.update(eventInvites).set({ status }).where(eq(eventInvites.id, id)).returning();
    return rows[0];
  },

  // ─── Notifications ───────────────────────────────────────────────────────
  async getNotifications(userId) {
    return db.select().from(notifications).where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  },
  async getUnreadCount(userId) {
    const rows = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return rows.length;
  },
  async createNotification(data) {
    const rows = await db.insert(notifications).values(data).returning();
    return rows[0];
  },
  async markNotificationRead(id) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  },
  async markAllRead(userId) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  },
};

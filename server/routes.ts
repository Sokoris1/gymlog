import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertUserSchema, insertExerciseSchema, insertWorkoutTemplateSchema,
  insertWorkoutSchema, insertWorkoutExerciseSchema, insertSetSchema,
  insertTrainingEventSchema, insertEventInviteSchema, insertNotificationSchema,
  insertFriendSchema } from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

// Strip passwordHash before sending to client
const safeUser = (u: any) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
};

export async function registerRoutes(httpServer: Server, app: Express) {
  await seedDatabase();

  // ─── Auth ────────────────────────────────────────────────────────────────

  // Check if username exists and whether it has a password
  app.post("/api/auth/check", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: "Username required" });
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return res.json({ exists: false });
      return res.json({ exists: true, hasPassword: !!user.passwordHash });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Login with password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return res.status(401).json({ error: "wrong_credentials" });
      if (!user.passwordHash) return res.status(400).json({ error: "no_password" }); // should set password first
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "wrong_credentials" });
      res.json({ user: safeUser(user) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Register new account
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, name, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      const existing = await storage.getUserByUsername(username.trim());
      if (existing) return res.status(409).json({ error: "username_taken" });
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({
        name: (name || username).trim(),
        username: username.trim(),
        passwordHash,
        goal: "general",
      });
      res.json({ user: safeUser(user) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Set password for existing account without one (migration flow)
  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.passwordHash) return res.status(400).json({ error: "already_has_password" });
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const updated = await storage.updateUser(user.id, { passwordHash });
      res.json({ user: safeUser(updated) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Change password (must know current password)
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
      const user = await storage.getUser(Number(userId));
      if (!user || !user.passwordHash) return res.status(404).json({ error: "User not found" });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "wrong_password" });
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUser(Number(userId), { passwordHash });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Change username
  app.post("/api/auth/change-username", async (req, res) => {
    try {
      const { userId, newUsername } = req.body;
      if (!userId || !newUsername) return res.status(400).json({ error: "Missing fields" });
      const existing = await storage.getUserByUsername(newUsername.trim());
      if (existing && existing.id !== Number(userId)) return res.status(409).json({ error: "username_taken" });
      const updated = await storage.updateUser(Number(userId), { username: newUsername.trim() });
      res.json({ user: safeUser(updated) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Delete account
  app.delete("/api/auth/account/:userId", async (req, res) => {
    try {
      const { password } = req.body;
      const user = await storage.getUser(Number(req.params.userId));
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.passwordHash) {
        if (!password) return res.status(400).json({ error: "Password required" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "wrong_password" });
      }
      await storage.deleteUser(Number(req.params.userId));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/auth/me/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.userId));
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: safeUser(user) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Users ────────────────────────────────────────────────────────────────
  app.get("/api/users", async (req, res) => {
    try {
      const u = await storage.getUsers();
      res.json(u);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ error: "Not found" });
      res.json(user);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const schema = insertUserSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const user = await storage.updateUser(Number(req.params.id), result.data);
      res.json(user);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // User stats
  app.get("/api/users/:id/stats", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const userWorkouts = await storage.getWorkouts(userId);
      const prs = await storage.getPersonalRecords(userId);
      let totalVolume = 0;
      for (const w of userWorkouts) {
        const wExs = await storage.getWorkoutExercises(w.id);
        for (const we of wExs) {
          const wSets = (await storage.getSets(we.id)).filter(s => s.isCompleted);
          for (const s of wSets) totalVolume += (s.weight * s.reps);
        }
      }
      res.json({
        totalWorkouts: userWorkouts.length,
        totalVolume: Math.round(totalVolume),
        totalPRs: prs.length,
      });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Friends ─────────────────────────────────────────────────────────────
  app.get("/api/users/:id/friends", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const friendships = await storage.getFriends(userId);
      const enriched = await Promise.all(friendships.map(async f => ({
        ...f,
        friendData: await storage.getUser(f.friendId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Incoming friend requests
  app.get("/api/users/:id/friend-requests", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const incoming = await storage.getIncomingRequests(userId);
      const enriched = await Promise.all(incoming.map(async f => ({
        ...f,
        senderData: await storage.getUser(f.userId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/friends/request", async (req, res) => {
    try {
      const { userId, friendId } = req.body;
      if (!userId || !friendId) return res.status(400).json({ error: "Missing fields" });
      const existing = await storage.getFriendship(userId, friendId);
      if (existing) return res.status(400).json({ error: "Already sent" });
      const f = await storage.createFriendRequest({ userId, friendId, status: "pending" });
      const sender = await storage.getUser(userId);
      await storage.createNotification({
        userId: friendId,
        type: "friend_request",
        payload: JSON.stringify({ fromUserId: userId, fromUserName: sender?.name }),
        isRead: false,
      });
      res.json(f);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/friends/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateFriendStatus(Number(req.params.id), status);
      res.json(updated);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Exercises ───────────────────────────────────────────────────────────
  app.get("/api/exercises", async (req, res) => {
    try {
      const { muscleGroup, equipment } = req.query;
      const exs = await storage.getExercises(muscleGroup as string, equipment as string);
      res.json(exs);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/exercises/:id", async (req, res) => {
    try {
      const ex = await storage.getExercise(Number(req.params.id));
      if (!ex) return res.status(404).json({ error: "Not found" });
      res.json(ex);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/exercises", async (req, res) => {
    try {
      const result = insertExerciseSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const ex = await storage.createExercise(result.data);
      res.json(ex);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Exercise progress
  app.get("/api/exercises/:id/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.getExerciseProgress(Number(req.params.userId), Number(req.params.id));
      res.json(progress);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workout Templates ───────────────────────────────────────────────────
  app.get("/api/templates", async (req, res) => {
    try { res.json(await storage.getWorkoutTemplates()); }
    catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const t = await storage.getWorkoutTemplate(Number(req.params.id));
      if (!t) return res.status(404).json({ error: "Not found" });
      res.json(t);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const result = insertWorkoutTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createWorkoutTemplate(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      res.json(await storage.updateWorkoutTemplate(Number(req.params.id), req.body));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Training Programs ───────────────────────────────────────────────────
  app.get("/api/programs", async (req, res) => {
    try { res.json(await storage.getTrainingPrograms()); }
    catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/programs/:id", async (req, res) => {
    try {
      const p = await storage.getTrainingProgram(Number(req.params.id));
      if (!p) return res.status(404).json({ error: "Not found" });
      res.json(p);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workouts ─────────────────────────────────────────────────────────────
  app.get("/api/workouts/:userId", async (req, res) => {
    try { res.json(await storage.getWorkouts(Number(req.params.userId))); }
    catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/workout/:id", async (req, res) => {
    try {
      const w = await storage.getWorkout(Number(req.params.id));
      if (!w) return res.status(404).json({ error: "Not found" });
      const wExs = await storage.getWorkoutExercises(w.id);
      const exercises = await Promise.all(wExs.map(async we => ({
        ...we,
        exercise: await storage.getExercise(we.exerciseId),
        sets: await storage.getSets(we.id),
      })));
      res.json({ ...w, exercises });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/workouts", async (req, res) => {
    try {
      const result = insertWorkoutSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createWorkout(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/workout/:id", async (req, res) => {
    try {
      const schema = insertWorkoutSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const w = await storage.updateWorkout(Number(req.params.id), result.data);

      // If workout is being finished, detect PRs
      if (result.data.endTime) {
        const workout = await storage.getWorkout(Number(req.params.id));
        if (workout) {
          const wExs = await storage.getWorkoutExercises(workout.id);
          const newPRs: Array<{ exerciseId: number; weight: number; reps: number }> = [];
          for (const we of wExs) {
            const wSets = (await storage.getSets(we.id)).filter(s => s.isCompleted);
            for (const s of wSets) {
              const existing = await storage.getPersonalRecord(workout.userId, we.exerciseId);
              if (!existing || s.weight > existing.weight || (s.weight === existing.weight && s.reps > existing.reps)) {
                await storage.upsertPersonalRecord({
                  userId: workout.userId,
                  exerciseId: we.exerciseId,
                  weight: s.weight,
                  reps: s.reps,
                  date: workout.date,
                });
                const ex = await storage.getExercise(we.exerciseId);
                newPRs.push({ exerciseId: we.exerciseId, weight: s.weight, reps: s.reps });
                await storage.createNotification({
                  userId: workout.userId,
                  type: "pr_achieved",
                  payload: JSON.stringify({ exerciseName: ex?.name, weight: s.weight, reps: s.reps }),
                  isRead: false,
                });
              }
            }
          }
          return res.json({ ...w, newPRs });
        }
      }
      res.json(w);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/workout/:id", async (req, res) => {
    try {
      await storage.deleteWorkout(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workout Exercises ───────────────────────────────────────────────────
  app.get("/api/workout/:id/exercises", async (req, res) => {
    try {
      const wExs = await storage.getWorkoutExercises(Number(req.params.id));
      const enriched = await Promise.all(wExs.map(async we => ({
        ...we,
        exercise: await storage.getExercise(we.exerciseId),
        sets: await storage.getSets(we.id),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/workout-exercises", async (req, res) => {
    try {
      const result = insertWorkoutExerciseSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const we = await storage.createWorkoutExercise(result.data);
      res.json({ ...we, exercise: await storage.getExercise(we.exerciseId), sets: [] });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/workout-exercises/:id", async (req, res) => {
    try {
      await storage.deleteWorkoutExercise(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Sets ─────────────────────────────────────────────────────────────────
  app.post("/api/sets", async (req, res) => {
    try {
      const result = insertSetSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createSet(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/sets/:id", async (req, res) => {
    try {
      const schema = insertSetSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.updateSet(Number(req.params.id), result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/sets/:id", async (req, res) => {
    try {
      await storage.deleteSet(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Personal Records ────────────────────────────────────────────────────
  app.get("/api/prs/:userId", async (req, res) => {
    try {
      const prs = await storage.getPersonalRecords(Number(req.params.userId));
      const enriched = await Promise.all(prs.map(async pr => ({
        ...pr,
        exercise: await storage.getExercise(pr.exerciseId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Manual create record
  app.post("/api/prs", async (req, res) => {
    try {
      const { userId, exerciseId, weight, reps, date } = req.body;
      if (!userId || !exerciseId || weight == null || reps == null || !date)
        return res.status(400).json({ error: "Missing fields" });
      const rows = await storage.createPersonalRecord({ userId, exerciseId, weight: Number(weight), reps: Number(reps), date });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Delete record
  app.delete("/api/prs/:id", async (req, res) => {
    try {
      await storage.deletePersonalRecord(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Best sets per exercise from history (for picking from history)
  app.get("/api/users/:userId/best-sets", async (req, res) => {
    try {
      const uid = Number(req.params.userId);
      const workouts = await storage.getUserWorkouts(uid);
      const bestMap: Record<number, { exerciseId: number; weight: number; reps: number; date: string }> = {};
      for (const w of workouts) {
        const full = await storage.getWorkout(w.id);
        for (const we of full?.exercises ?? []) {
          for (const s of we.sets ?? []) {
            if (!s.isCompleted) continue;
            const prev = bestMap[we.exerciseId];
            if (!prev || s.weight > prev.weight || (s.weight === prev.weight && s.reps > prev.reps)) {
              bestMap[we.exerciseId] = { exerciseId: we.exerciseId, weight: s.weight, reps: s.reps, date: w.date };
            }
          }
        }
      }
      const result = await Promise.all(Object.values(bestMap).map(async b => ({
        ...b,
        exercise: await storage.getExercise(b.exerciseId),
      })));
      res.json(result);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Public workouts for a user (for friend profile)
  app.get("/api/users/:userId/workouts", async (req, res) => {
    try {
      const workouts = await storage.getUserWorkouts(Number(req.params.userId));
      res.json(workouts);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Training Events ─────────────────────────────────────────────────────
  app.get("/api/events/:userId", async (req, res) => {
    try { res.json(await storage.getTrainingEvents(Number(req.params.userId))); }
    catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const result = insertTrainingEventSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createTrainingEvent(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Event Invites ───────────────────────────────────────────────────────
  app.get("/api/invites/:userId", async (req, res) => {
    try {
      const invites = await storage.getEventInvites(Number(req.params.userId));
      const enriched = await Promise.all(invites.map(async inv => ({
        ...inv,
        event: await storage.getTrainingEvent(inv.eventId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/invites", async (req, res) => {
    try {
      const result = insertEventInviteSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const inv = await storage.createEventInvite(result.data);
      const event = await storage.getTrainingEvent(inv.eventId);
      await storage.createNotification({
        userId: inv.userId,
        type: "event_invite",
        payload: JSON.stringify({ eventTitle: event?.title, eventId: inv.eventId }),
        isRead: false,
      });
      res.json(inv);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/invites/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      res.json(await storage.updateEventInviteStatus(Number(req.params.id), status));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Notifications ───────────────────────────────────────────────────────
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifs = await storage.getNotifications(Number(req.params.userId));
      const unread = await storage.getUnreadCount(Number(req.params.userId));
      res.json({ notifications: notifs, unreadCount: unread });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/notifications/mark-all-read/:userId", async (req, res) => {
    try {
      await storage.markAllRead(Number(req.params.userId));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });
}

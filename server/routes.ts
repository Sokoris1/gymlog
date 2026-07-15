import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import passport from "passport";
import { storage } from "./storage";
import { sendPushToUser, getPublicKey, isPushConfigured } from "./push";
import { runScheduledPush } from "./pushScheduler";
import { insertUserSchema, insertExerciseSchema, insertWorkoutTemplateSchema,
  insertTrainingProgramSchema,
  insertWorkoutSchema, insertWorkoutExerciseSchema, insertSetSchema,
  insertTrainingEventSchema, insertEventInviteSchema, insertNotificationSchema,
  insertFriendSchema } from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

const safeUser = (u: any) => {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
};

// ─── Auth middleware ──────────────────────────────────────────────────────────
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "unauthorized" });
};

const requireOwner = (resourceUserId: number, req: Request, res: Response): boolean => {
  const me = (req.user as any)?.id;
  if (me !== resourceUserId) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
};

export async function registerRoutes(httpServer: Server, app: Express) {
  // NOTE: seedDatabase() should be called once at startup from index.ts, not here.

  // ─── Auth ────────────────────────────────────────────────────────────────

  app.get("/api/auth/session", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: safeUser(req.user) });
    } else {
      res.status(401).json({ error: "not_authenticated" });
    }
  });

  app.post("/api/auth/check", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: "Username required" });
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return res.json({ exists: false });
      return res.json({ exists: true, hasPassword: !!user.passwordHash });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ error: String(err) });
      if (!user) return res.status(401).json({ error: info?.message || "wrong_credentials" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return res.status(500).json({ error: String(loginErr) });
        res.json({ user: safeUser(user) });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ ok: true });
    });
  });

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
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ error: String(err) });
        res.json({ user: safeUser(user) });
      });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.passwordHash) return res.status(400).json({ error: "already_has_password" });
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const updated = await storage.updateUser(user.id, { passwordHash });
      req.logIn(updated, (err) => {
        if (err) return res.status(500).json({ error: String(err) });
        res.json({ user: safeUser(updated) });
      });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
      const user = await storage.getUser(me);
      if (!user || !user.passwordHash) return res.status(404).json({ error: "User not found" });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "wrong_password" });
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUser(me, { passwordHash });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/auth/change-username", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { newUsername } = req.body;
      if (!newUsername) return res.status(400).json({ error: "Missing fields" });
      const existing = await storage.getUserByUsername(newUsername.trim());
      if (existing && existing.id !== me) return res.status(409).json({ error: "username_taken" });
      const updated = await storage.updateUser(me, { username: newUsername.trim() });
      res.json({ user: safeUser(updated) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/auth/account/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const { password } = req.body;
      const user = await storage.getUser(me);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.passwordHash) {
        if (!password) return res.status(400).json({ error: "Password required" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: "wrong_password" });
      }
      await storage.deleteUser(me);
      req.logout(() => res.json({ ok: true }));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // FIX #1: added requireAuth — previously any unauthenticated request could fetch any user's data
  app.get("/api/auth/me/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const user = await storage.getUser(me);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: safeUser(user) });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Users ────────────────────────────────────────────────────────────────
  // FIX #2: added requireAuth + safeUser — previously the full user list (with all fields) was public
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const u = await storage.getUsers();
      res.json(u.map(safeUser));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ error: "Not found" });
      res.json(safeUser(user));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // FIX #10: apply safeUser to response so passwordHash is never sent to the client
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.id)) return res.status(403).json({ error: "forbidden" });
      const schema = insertUserSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const user = await storage.updateUser(Number(req.params.id), result.data);

      if (result.data.bodyWeight != null) {
        const today = new Date().toISOString().slice(0, 10);
        // FIX #8: removed fallback create on upsert failure to avoid silent duplicates
        try {
          await storage.upsertBodyWeightLog({ userId: me, weight: result.data.bodyWeight, date: today });
        } catch (upsertErr) {
          console.error("upsertBodyWeightLog failed:", upsertErr);
        }
      }

      res.json(safeUser(user));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/users/:id/stats", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const userWorkouts = (await storage.getWorkouts(userId)).filter((w: any) => !!w.endTime);
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

  // ─── Body Weight Logs ─────────────────────────────────────────────────────
  app.get("/api/users/:userId/body-weight", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const logs = await storage.getBodyWeightLogs(me);
      res.json(logs);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/users/:userId/body-weight", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const { weight, date } = req.body;
      if (!weight || !date) return res.status(400).json({ error: "Missing fields" });
      const log = await storage.createBodyWeightLog({ userId: me, weight: Number(weight), date });
      const today = new Date().toISOString().slice(0, 10);
      if (date === today) {
        await storage.updateUser(me, { bodyWeight: Number(weight) });
      }
      res.json(log);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // FIX #4: added owner check — previously any authenticated user could delete another user's weight log
  app.delete("/api/body-weight/:id", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const log = await storage.getBodyWeightLogs(me);
      const entry = log.find(l => l.id === Number(req.params.id));
      if (!entry) return res.status(404).json({ error: "Not found or not yours" });
      await storage.deleteBodyWeightLog(entry.id);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Friends ──────────────────────────────────────────────────────────────
  app.get("/api/users/:id/friends", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const friendships = await storage.getFriends(userId);
      const enriched = await Promise.all(friendships.map(async f => ({
        ...f,
        friendData: safeUser(await storage.getUser(f.friendId)),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/users/:id/friend-requests", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.id)) return res.status(403).json({ error: "forbidden" });
      const incoming = await storage.getIncomingRequests(me);
      const enriched = await Promise.all(incoming.map(async f => ({
        ...f,
        senderData: safeUser(await storage.getUser(f.userId)),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/friends/request", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { friendId } = req.body;
      if (!friendId) return res.status(400).json({ error: "Missing fields" });
      const existing = await storage.getFriendship(me, friendId);
      if (existing) return res.status(400).json({ error: "Already sent" });
      const f = await storage.createFriendRequest({ userId: me, friendId, status: "pending" });
      const sender = await storage.getUser(me);
      const friendMsg = `${sender?.name ?? "Someone"} sent you a friend request`;
      await storage.createNotification({
        userId: friendId,
        type: "friend_request",
        message: friendMsg,
        isRead: false,
      });
      sendPushToUser(friendId, {
        title: "GymLog",
        body: friendMsg,
        url: "/#/friends",
      }).catch(err => console.error("[push] friend_request:", err));
      res.json(f);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/friends/:id/status", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { status } = req.body;
      const friendRecord = await storage.getFriendshipById(Number(req.params.id));
      if (!friendRecord) return res.status(404).json({ error: "Not found" });
      if (friendRecord.friendId !== me) return res.status(403).json({ error: "forbidden" });
      const updated = await storage.updateFriendStatus(Number(req.params.id), status);
      res.json(updated);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Exercises ────────────────────────────────────────────────────────────
  app.get("/api/exercises", async (req, res) => {
    try {
      const { muscleGroup, equipment } = req.query;
      const exs = await storage.getExercises(muscleGroup as string, equipment as string);
      res.json(exs);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/exercises/:id", async (req, res) => {try {
      const ex = await storage.getExercise(Number(req.params.id));
      if (!ex) return res.status(404).json({ error: "Not found" });
      res.json(ex);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/exercises", requireAuth, async (req, res) => {
    try {
      const result = insertExerciseSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const ex = await storage.createExercise(result.data);
      res.json(ex);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get("/api/exercises/:id/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.getExerciseProgress(Number(req.params.userId), Number(req.params.id));
      res.json(progress);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Suggested weight for a new set: heaviest set from the user's most recent prior
  // workout with this exercise. excludeWorkoutId skips the in-progress workout.
  app.get("/api/exercises/:id/last-weight/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const exclude = req.query.excludeWorkoutId ? Number(req.query.excludeWorkoutId) : 0;
      const weight = await storage.getLastBestWeight(Number(req.params.userId), Number(req.params.id), exclude);
      res.json({ weight });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Map of exerciseId -> most recent date the user performed it. Used to sort
  // the "add exercise" picker so recently-done exercises surface first.
  app.get("/api/users/:userId/exercise-usage", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      res.json(await storage.getExerciseUsage(Number(req.params.userId)));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workout Templates ────────────────────────────────────────────────────
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

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const result = insertWorkoutTemplateSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createWorkoutTemplate(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      res.json(await storage.updateWorkoutTemplate(Number(req.params.id), req.body));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteWorkoutTemplate(Number(req.params.id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Training Programs ────────────────────────────────────────────────────
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

  app.post("/api/programs", requireAuth, async (req, res) => {
    try {
      const result = insertTrainingProgramSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createTrainingProgram(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/programs/:id", requireAuth, async (req, res) => {
    try {
      res.json(await storage.updateTrainingProgram(Number(req.params.id), req.body));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/programs/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTrainingProgram(Number(req.params.id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Push Notifications ─────────────────────────────────────────────────────
  app.get("/api/push/public-key", (_req, res) => {
    res.json({ key: getPublicKey(), enabled: isPushConfigured() });
  });

  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { subscription, tz } = req.body;
      const endpoint = subscription?.endpoint;
      const p256dh = subscription?.keys?.p256dh;
      const auth = subscription?.keys?.auth;
      if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "Invalid subscription" });
      await storage.createPushSubscription({ userId: me, endpoint, p256dh, auth });
      if (tz) await storage.updateUser(me, { pushTz: tz });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // Triggered by an external cron (token-protected; Render free tier sleeps).
  app.post("/api/push/run", async (req, res) => {
    try {
      const secret = process.env.PUSH_CRON_SECRET;
      const token = req.query.token ?? req.headers["x-cron-token"];
      if (!secret || token !== secret) return res.status(401).json({ error: "unauthorized" });
      const result = await runScheduledPush();
      res.json(result);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workouts ─────────────────────────────────────────────────────────────
  app.get("/api/workouts/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      res.json(await storage.getWorkouts(me));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // GET /api/workout/:id — no requireAuth so the query doesn't fail after session refresh
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

  app.post("/api/workouts", requireAuth, async (req, res) => {
    try {
      const result = insertWorkoutSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const me = (req.user as any).id;
      if (result.data.userId !== me) return res.status(403).json({ error: "forbidden" });
      res.json(await storage.createWorkout(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/workout/:id", requireAuth, async (req, res) => {
    try {
      const w = await storage.getWorkout(Number(req.params.id));
      if (!w) return res.status(404).json({ error: "Not found" });
      const me = (req.user as any).id;
      if (w.userId !== me) return res.status(403).json({ error: "forbidden" });
      const schema = insertWorkoutSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.updateWorkout(Number(req.params.id), result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/workout/:id", requireAuth, async (req, res) => {
    try {
      const w = await storage.getWorkout(Number(req.params.id));
      if (!w) return res.status(404).json({ error: "Not found" });
      const me = (req.user as any).id;
      if (w.userId !== me) return res.status(403).json({ error: "forbidden" });
      await storage.deleteWorkout(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // POST /api/workout/:id/repeat — start a fresh workout from a past one,
  // copying exercises (with their notes) and sets (weight/reps/rpe) as a
  // starting point but marked not-completed. Returns the new workout row.
  app.post("/api/workout/:id/repeat", requireAuth, async (req, res) => {
    try {
      const source = await storage.getWorkout(Number(req.params.id));
      if (!source) return res.status(404).json({ error: "Not found" });
      const me = (req.user as any).id;
      if (source.userId !== me) return res.status(403).json({ error: "forbidden" });

      // date/startTime come from the client so they reflect the user's timezone;
      // fall back to server time if omitted.
      const now = new Date();
      const date = typeof req.body?.date === "string" ? req.body.date : now.toISOString().split("T")[0];
      const startTime = typeof req.body?.startTime === "string"
        ? req.body.startTime
        : now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

      const newWorkout = await storage.createWorkout({
        userId: me,
        title: source.title,
        date,
        startTime,
      });

      const sourceExercises = (await storage.getWorkoutExercises(source.id))
        .sort((a, b) => a.order - b.order);
      for (const we of sourceExercises) {
        const newWe = await storage.createWorkoutExercise({
          workoutId: newWorkout.id,
          exerciseId: we.exerciseId,
          order: we.order,
          note: we.note,
        });
        const srcSets = (await storage.getSets(we.id)).sort((a, b) => a.setNumber - b.setNumber);
        for (const s of srcSets) {
          await storage.createSet({
            workoutExerciseId: newWe.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            isCompleted: false,
          });
        }
      }

      res.json(newWorkout);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Workout Exercises ────────────────────────────────────────────────────
  app.get("/api/workout/:id/exercises", requireAuth, async (req, res) => {
    try {
      const w = await storage.getWorkout(Number(req.params.id));
      if (!w) return res.status(404).json({ error: "Not found" });
      const me = (req.user as any).id;
      if (w.userId !== me) return res.status(403).json({ error: "forbidden" });
      const wExs = await storage.getWorkoutExercises(Number(req.params.id));
      const enriched = await Promise.all(wExs.map(async we => ({
        ...we,
        exercise: await storage.getExercise(we.exerciseId),
        sets: await storage.getSets(we.id),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/workout-exercises", requireAuth, async (req, res) => {
    try {
      const result = insertWorkoutExerciseSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const w = await storage.getWorkout(result.data.workoutId);
      if (!w) return res.status(404).json({ error: "Not found" });
      const me = (req.user as any).id;
      if (w.userId !== me) return res.status(403).json({ error: "forbidden" });
      const we = await storage.createWorkoutExercise(result.data);
      res.json({ ...we, exercise: await storage.getExercise(we.exerciseId), sets: [] });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/workout-exercises/:id", requireAuth, async (req, res) => {
    try {
      const we = await storage.getWorkoutExercise(Number(req.params.id));
      if (!we) return res.status(404).json({ error: "Not found" });
      const w = await storage.getWorkout(we.workoutId);
      const me = (req.user as any).id;
      if (!w || w.userId !== me) return res.status(403).json({ error: "forbidden" });
      const schema = insertWorkoutExerciseSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.updateWorkoutExercise(Number(req.params.id), result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/workout-exercises/:id", requireAuth, async (req, res) => {
    try {
      const we = await storage.getWorkoutExercise(Number(req.params.id));
      if (!we) return res.status(404).json({ error: "Not found" });
      const w = await storage.getWorkout(we.workoutId);
      const me = (req.user as any).id;
      if (!w || w.userId !== me) return res.status(403).json({ error: "forbidden" });
      await storage.deleteWorkoutExercise(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Sets ─────────────────────────────────────────────────────────────────
  app.post("/api/sets", requireAuth, async (req, res) => {
    try {
      const result = insertSetSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const we = await storage.getWorkoutExercise(result.data.workoutExerciseId);
      if (!we) return res.status(404).json({ error: "Not found" });
      const w = await storage.getWorkout(we.workoutId);
      const me = (req.user as any).id;
      if (!w || w.userId !== me) return res.status(403).json({ error: "forbidden" });
      res.json(await storage.createSet(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/sets/:id", requireAuth, async (req, res) => {
    try {
      const set = await storage.getSet(Number(req.params.id));
      if (!set) return res.status(404).json({ error: "Not found" });
      const we = await storage.getWorkoutExercise(set.workoutExerciseId);
      const w = we ? await storage.getWorkout(we.workoutId) : null;
      const me = (req.user as any).id;
      if (!w || w.userId !== me) return res.status(403).json({ error: "forbidden" });
      const schema = insertSetSchema.partial();
      const result = schema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.updateSet(Number(req.params.id), result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/sets/:id", requireAuth, async (req, res) => {
    try {
      const set = await storage.getSet(Number(req.params.id));
      if (!set) return res.status(404).json({ error: "Not found" });
      const we = await storage.getWorkoutExercise(set.workoutExerciseId);
      const w = we ? await storage.getWorkout(we.workoutId) : null;
      const me = (req.user as any).id;
      if (!w || w.userId !== me) return res.status(403).json({ error: "forbidden" });
      await storage.deleteSet(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Personal Records ─────────────────────────────────────────────────────
  app.get("/api/prs/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const target = Number(req.params.userId);
      if (me !== target && !(await storage.areFriends(me, target))) {
        return res.status(403).json({ error: "forbidden" });
      }
      const prs = await storage.getPersonalRecords(target);
      const enriched = await Promise.all(prs.map(async pr => ({
        ...pr,
        exercise: await storage.getExercise(pr.exerciseId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/prs", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const { exerciseId, weight, reps, date } = req.body;
      if (!exerciseId || weight == null || reps == null || !date)
        return res.status(400).json({ error: "Missing fields" });
      const rows = await storage.upsertPersonalRecord({ userId: me, exerciseId, weight: Number(weight), reps: Number(reps), date });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // FIX: getPersonalRecord(userId, exerciseId) signature doesn't suit deletion by id;
  // use getPersonalRecords(userId) and filter by id for correct owner check
  app.delete("/api/prs/:id", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const prId = Number(req.params.id);
      const allPrs = await storage.getPersonalRecords(me);
      const pr = allPrs.find(p => p.id === prId);
      if (!pr) return res.status(404).json({ error: "Not found" });
      await storage.deletePersonalRecord(pr.id);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // FIX #3: added requireAuth + owner check — previously any user could view another user's best sets
  app.get("/api/users/:userId/best-sets", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const userWorkouts = await storage.getWorkouts(me);
      const bestMap: Record<number, { exerciseId: number; weight: number; reps: number; date: string }> = {};
      for (const w of userWorkouts) {
        const wExs = await storage.getWorkoutExercises(w.id);
        for (const we of wExs) {
          const wSets = (await storage.getSets(we.id)).filter((s: any) => s.isCompleted);
          for (const s of wSets) {
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

  // Owner can view own workouts; friends can view accepted friend's completed workouts.
  app.get("/api/users/:userId/workouts", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const target = Number(req.params.userId);
      if (me !== target && !(await storage.areFriends(me, target))) {
        return res.status(403).json({ error: "forbidden" });
      }
      const workouts = await storage.getWorkouts(target);
      const completed = workouts.filter((w: any) => !!w.endTime);
      res.json(completed);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Admin ────────────────────────────────────────────────────────────────
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const admin = req.user as any;
      if (!admin?.isAdmin) return res.status(403).json({ error: "forbidden" });
      const users = await storage.getAllUsers();
      res.json(users.map(u => {
        const { passwordHash, ...safe } = u as any;
        return safe;
      }));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const admin = req.user as any;
      if (!admin?.isAdmin) return res.status(403).json({ error: "forbidden" });
      const targetId = Number(req.params.id);
      if (targetId === admin.id) return res.status(400).json({ error: "Cannot delete yourself" });
      await storage.deleteUser(targetId);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Training Events ──────────────────────────────────────────────────────
  app.get("/api/events/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      res.json(await storage.getTrainingEvents(me));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const result = insertTrainingEventSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json(await storage.createTrainingEvent(result.data));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Event Invites ────────────────────────────────────────────────────────
  app.get("/api/invites/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const invites = await storage.getEventInvites(me);
      const enriched = await Promise.all(invites.map(async inv => ({
        ...inv,
        event: await storage.getTrainingEvent(inv.eventId),
      })));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/invites", requireAuth, async (req, res) => {
    try {
      const result = insertEventInviteSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: result.error });
      const inv = await storage.createEventInvite(result.data);
      const event = await storage.getTrainingEvent(inv.eventId);
      const inviteMsg = `You have been invited to: ${event?.title ?? "an event"}`;
      await storage.createNotification({
        userId: inv.userId,
        type: "event_invite",
        message: inviteMsg,
        isRead: false,
      });
      sendPushToUser(inv.userId, {
        title: "GymLog",
        body: inviteMsg,
        url: "/#/calendar",
      }).catch(err => console.error("[push] event_invite:", err));
      res.json(inv);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/invites/:id/status", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      const invite = await storage.getEventInvite(Number(req.params.id));
      if (!invite) return res.status(404).json({ error: "Not found" });
      if (invite.userId !== me) return res.status(403).json({ error: "forbidden" });
      const { status } = req.body;
      res.json(await storage.updateEventInviteStatus(Number(req.params.id), status));
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  app.get("/api/notifications/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      const notifs = await storage.getNotifications(me);
      const unread = await storage.getUnreadCount(me);
      res.json({ notifications: notifs, unreadCount: unread });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(Number(req.params.id));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/notifications/mark-all-read/:userId", requireAuth, async (req, res) => {
    try {
      const me = (req.user as any).id;
      if (me !== Number(req.params.userId)) return res.status(403).json({ error: "forbidden" });
      await storage.markAllRead(me);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });
}

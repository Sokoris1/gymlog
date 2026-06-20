import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { initPush } from "./push";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

// Trust Render's load balancer proxy so secure cookies work over HTTPS
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ─── Session ──────────────────────────────────────────────────────────────────
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

app.use(session({
  secret: process.env.SESSION_SECRET || "gymlog-dev-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: "lax",
  },
  store: new PgSession({
    pool: pgPool,
    createTableIfMissing: true,
  }),
}));

// ─── Passport ─────────────────────────────────────────────────────────────────
passport.use(new LocalStrategy(
  { usernameField: "username", passwordField: "password" },
  async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username.trim());
      if (!user) return done(null, false, { message: "wrong_credentials" });
      if (!user.passwordHash) return done(null, false, { message: "no_password" });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return done(null, false, { message: "wrong_credentials" });
      return done(null, user);
    } catch (e) {
      return done(e);
    }
  }
));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || false);
  } catch (e) {
    done(e);
  }
});

app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ─── Ensure tables exist ──────────────────────────────────────────────────────
async function ensureTables() {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS body_weight_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    log("ensureTables: body_weight_logs OK");

    // Reconcile schema drift: add columns the app code expects but that older
    // deployments of the DB may be missing. All additive + idempotent.
    await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS note TEXT`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT`);
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id INTEGER`);
    await client.query(`ALTER TABLE training_events ADD COLUMN IF NOT EXISTS date TEXT`);
    await client.query(`ALTER TABLE training_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL`);
    await client.query(`ALTER TABLE event_invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL`);
    log("ensureTables: column reconciliation OK");

    // Push notifications: subscriptions table + user preference columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_reminder_enabled BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_reminder_days TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_reminder_time TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_tz TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_inactivity_days INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_last_reminder_date TEXT`);
    log("ensureTables: push tables OK");

    // Active training program per user
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_program_id INTEGER`);
    log("ensureTables: active_program_id OK");
  } catch (e) {
    console.error("ensureTables error:", e);
  } finally {
    client.release();
  }
}

(async () => {
  await ensureTables();
  initPush();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();

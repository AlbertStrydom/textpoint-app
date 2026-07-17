import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createAppUser, db, getAllUsers, getUnifiedCalendarFeedByToken } from "../db";
import { startReminderScheduler } from "../reminderScheduler";
import { buildCalendarIcs, type CalendarFeedScope } from "../calendarFeeds";
import { ENV, evaluateEnvironmentReadiness } from "./env";
import { logger } from "./logger";
import { setupWebSocket } from "../websocket";
import {
  assertStorageConfiguration,
  ensureStorageReady,
  getStorageRuntimeSummary,
  getLegacyLocalStorageRoot,
  serveStorageObject,
} from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function ensureBootstrapAdmin() {
  if (!ENV.bootstrapAdminEmail || !ENV.bootstrapAdminPassword) {
    return;
  }

  const existingUsers = await getAllUsers();
  if (existingUsers.length > 0) {
    return;
  }

  await createAppUser({
    name: ENV.bootstrapAdminName,
    email: ENV.bootstrapAdminEmail,
    role: "super_admin",
    password: ENV.bootstrapAdminPassword,
  });

  logger.info(
    { email: ENV.bootstrapAdminEmail },
    "Bootstrap Super Admin created. Remove BOOTSTRAP_ADMIN_PASSWORD after first deploy."
  );
}

function buildContentSecurityPolicy(): Record<string, string[]> {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "worker-src": ["'self'", "blob:"],
    "form-action": ["'self'"],
  };

  if (ENV.isProduction) {
    directives["script-src"] = ["'self'"];
    directives["connect-src"] = ["'self'", "https:"];
  } else {
    directives["script-src"] = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
    directives["connect-src"] = ["'self'", "http:", "https:", "ws:", "wss:"];
  }

  return directives;
}

async function startServer() {
  await ensureStorageReady();
  await ensureBootstrapAdmin();
  startReminderScheduler();

  const environmentReadiness = evaluateEnvironmentReadiness();
  if (!environmentReadiness.ok) {
    const errors = environmentReadiness.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message);
    if (errors.length > 0) {
      logger.error({ errors }, "Environment validation failed at startup");
      process.exitCode = 1;
      return;
    }
  }
  const warnings = environmentReadiness.issues
    .filter((i) => i.severity === "warning")
    .map((i) => i.message);
  if (warnings.length > 0) {
    logger.warn({ warnings }, "Environment warnings at startup");
  }

  const app = express();
  const server = createServer(app);

  // Set up WebSocket for real-time notifications
  setupWebSocket(server);

  // Trust the first proxy hop so req.secure / req.ip / X-Forwarded-* are honored
  // when running behind Railway, nginx, or any TLS-terminating load balancer.
  // Required for the Secure + SameSite=None session cookies to work in production.
  app.set("trust proxy", 1);

  app.disable("x-powered-by");

  // Security headers via helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: buildContentSecurityPolicy(),
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many requests. Please try again later." },
  });
  app.use("/api/", generalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many login attempts. Please try again in 15 minutes." },
  });
  app.use("/api/trpc/auth", authLimiter);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/trpc/auth")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  app.get("/storage/*", async (req, res) => {
    try {
      await serveStorageObject(req, res);
    } catch (error) {
      logger.error({ err: error, path: req.path }, "Failed to serve storage object");
      res.status(404).type("text/plain").send("File not found.");
    }
  });
  app.use("/uploads", express.static(getLegacyLocalStorageRoot()));

  app.get("/healthz", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ ok: true, status: "healthy" });
    } catch (error) {
      logger.error({ err: error }, "Health check failed");
      res.status(503).json({ ok: false, status: "error" });
    }
  });

  app.get("/readyz", async (_req, res) => {
    const environment = evaluateEnvironmentReadiness();
    let databaseOk = false;
    let storageOk = false;
    let databaseError: string | null = null;
    let storageError: string | null = null;

    try {
      await db.execute(sql`SELECT 1`);
      databaseOk = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Database check failed.";
    }

    try {
      assertStorageConfiguration();
      storageOk = true;
    } catch (error) {
      storageError = error instanceof Error ? error.message : "Storage check failed.";
    }

    const ok = databaseOk && storageOk && environment.ok;
    res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? "ready" : "blocked",
      checkedAt: new Date().toISOString(),
      checks: {
        database: {
          ok: databaseOk,
          error: databaseError,
        },
        storage: {
          ok: storageOk,
          error: storageError,
        },
        environment,
      },
    });
  });

  app.get("/calendar/feed/:token.ics", async (req, res) => {
    try {
      const token = String(req.params.token ?? "").trim();
      const scopeQuery = String(req.query.scope ?? "all").trim().toLowerCase();
      const scope: CalendarFeedScope =
        scopeQuery === "private" ||
        scopeQuery === "shared" ||
        scopeQuery === "operations" ||
        scopeQuery === "all"
          ? scopeQuery
          : "all";
      const branchIdRaw = req.query.branchId;
      const branchId =
        branchIdRaw === undefined
          ? undefined
          : Number.isFinite(Number(branchIdRaw))
            ? Number(branchIdRaw)
            : undefined;

      const feed = await getUnifiedCalendarFeedByToken(token, {
        scope,
        branchId,
      });

      if (!feed) {
        res.status(404).type("text/plain").send("Calendar feed not found.");
        return;
      }

      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.send(
        buildCalendarIcs(feed.events, {
          prodId: "-//TextPoint//Unified Calendar Feed//EN",
          calendarName: feed.calendarName,
          calendarDescription: feed.calendarDescription,
        })
      );
    } catch (error) {
      logger.error({ err: error, token: req.params.token }, "Failed to serve calendar feed");
      res.status(500).type("text/plain").send("Failed to generate calendar feed.");
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);
  const storageSummary = getStorageRuntimeSummary();

  if (port !== preferredPort) {
    logger.warn({ preferredPort, port }, "Preferred port busy, using fallback");
  }

  server.listen(port, () => {
    logger.info(
      { ...storageSummary },
      `Server running on http://localhost:${port}/`
    );
  });
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exitCode = 1;
});

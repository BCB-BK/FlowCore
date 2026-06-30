import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { correlationId } from "./middlewares/correlation-id";
import { securityHeaders } from "./middlewares/security-headers";
import { apiRateLimit } from "./middlewares/rate-limit";
import { notFoundHandler, errorHandler } from "./middlewares/error-handler";
import { appConfig } from "./lib/config";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    user: {
      principalId: string;
      externalId: string;
      displayName: string;
      email: string;
    };
    graphAccessToken?: string;
    oauthState?: string;
  }
}

const isProduction = appConfig.nodeEnv === "production";

const PgStore = connectPgSimple(session);

const sessionStore = isProduction
  ? new PgStore({
      conString: appConfig.databaseUrl,
      tableName: "user_sessions",
      pruneSessionInterval: 60 * 15,
    })
  : undefined;

const app: Express = express();

app.set("etag", false);

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(securityHeaders);
app.use(correlationId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req.headers["x-correlation-id"] as string) ?? req.id,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const PROD_ORIGIN = "https://flowcore.bildungscampus-backnang.de";

app.use(
  cors({
    origin: isProduction
      ? (origin, callback) => {
          if (!origin || origin === PROD_ORIGIN) {
            callback(null, true);
          } else {
            const err = Object.assign(new Error(`CORS: origin not allowed`), { status: 403 });
            callback(err);
          }
        }
      : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(apiRateLimit);
app.use(
  session({
    store: sessionStore,
    secret: appConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

// Global auth fallback guard — defense-in-depth safety net.
// Runs before route handlers. Blocks unauthenticated access to all /api/* paths
// except the explicitly public ones (health check and auth flow).
// Per-route requireAuth middleware still validates fully; this guard only catches
// routes that were accidentally added without requireAuth.
const PUBLIC_PATH_PREFIXES = ["/healthz", "/auth"];
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const isPublic = PUBLIC_PATH_PREFIXES.some(
    (p) => req.path === p || req.path.startsWith(p + "/"),
  );
  if (isPublic) { next(); return; }

  if (req.headers.authorization?.startsWith("Bearer ")) { next(); return; }
  if (appConfig.authDevMode) { next(); return; }
  if (req.session?.user) { next(); return; }

  res.status(401).json({ error: "Authentication required" });
});

app.use("/api", router);

app.use("/api/{*path}", notFoundHandler);
app.use(errorHandler);

export async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions (expire);
  `);
  logger.info("user_sessions table ensured");
}

export default app;

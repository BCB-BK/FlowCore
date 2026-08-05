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
import { envInt, envString } from "./lib/env";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    user: {
      principalId: string;
      externalId: string;
      displayName: string;
      email: string;
    };
    /** AES-256-GCM-verschluesselt, siehe lib/session-crypto (Audit A3). */
    graphAccessTokenEnc?: string;
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
// Konfigurierbar über APP_PUBLIC_URL; der Fallback hält bestehende
// Deployments ohne gesetzte Variable funktionsfähig.
const PROD_ORIGIN =
  process.env["APP_PUBLIC_URL"]?.replace(/\/$/, "") ||
  "https://flowcore.bildungscampus-backnang.de";

// The Copilot Studio / Power Platform custom connector endpoints are
// authenticated via a per-agent API key (no cookies), and are called
// server-to-server by Power Platform (and, when testing/importing the
// connector, from the browser-based Power Apps/Power Automate portal on a
// microsoft.com-controlled origin). They never carry the FlowCore session
// cookie, so the strict same-origin CORS policy below (which exists to
// protect cookie-authenticated routes from CSRF) does not apply and would
// otherwise incorrectly block legitimate connector traffic.
const openCors = cors({ origin: true, credentials: false });
const strictCors = cors({
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
});
const COPILOT_CONNECTOR_OPEN_PATHS = [
  "/api/copilot/openapi.json",
  "/api/copilot/swagger.json",
  "/api/copilot/search",
  "/api/copilot/nodes/",
];

app.use((req, res, next) => {
  if (COPILOT_CONNECTOR_OPEN_PATHS.some((p) => req.path.startsWith(p))) {
    openCors(req, res, next);
    return;
  }
  strictCors(req, res, next);
});
const jsonBodyLimit = envString("JSON_BODY_LIMIT", "2mb");
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }));
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
      maxAge: envInt("SESSION_MAX_AGE_HOURS", 8) * 60 * 60 * 1000,
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
// The Copilot Studio / Power Platform custom connector (Cluster 13) does not
// use the session cookie or a Bearer token — it authenticates via a per-agent
// API key sent as X-FlowCore-Api-Key. Without this bypass, this fallback
// guard rejects every connector request with a generic "Authentication
// required" 401 before requireConnectorKey ever runs, regardless of whether
// the key itself is valid (this masked a real prod incident: connector
// calls always 401'd here, even with a correct key). The per-route
// requireConnectorKey middleware still fully validates the key's presence
// and validity — this bypass only lets the request reach that check.
const COPILOT_CONNECTOR_API_KEY_PATH_PREFIXES = ["/copilot/search", "/copilot/nodes/"];
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const isPublic = PUBLIC_PATH_PREFIXES.some(
    (p) => req.path === p || req.path.startsWith(p + "/"),
  );
  if (isPublic) { next(); return; }

  const isConnectorKeyRoute = COPILOT_CONNECTOR_API_KEY_PATH_PREFIXES.some(
    (p) => req.path.startsWith(p),
  );
  if (isConnectorKeyRoute) { next(); return; }

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

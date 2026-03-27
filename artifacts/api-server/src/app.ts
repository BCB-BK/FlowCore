import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { correlationId } from "./middlewares/correlation-id";
import { securityHeaders } from "./middlewares/security-headers";
import { apiRateLimit } from "./middlewares/rate-limit";
import { appConfig } from "./lib/config";

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
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
    })
  : undefined;

const app: Express = express();

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
app.use(
  cors({
    origin: true,
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

app.use("/api", router);

export default app;

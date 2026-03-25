import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { correlationId } from "./middlewares/correlation-id";
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

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: appConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: appConfig.nodeEnv === "production",
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

export default app;

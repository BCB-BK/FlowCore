import type { Request, Response, NextFunction } from "express";
import { appConfig } from "../lib/config";

const isProduction = appConfig.nodeEnv === "production";

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  if (isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self'",
        "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com",
        "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.office.com",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  } else {
    res.removeHeader("X-Frame-Options");
  }

  next();
}

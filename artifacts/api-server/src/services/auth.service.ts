import { ConfidentialClientApplication } from "@azure/msal-node";
import { appConfig } from "../lib/config";
import { logger } from "../lib/logger";

const ENTRA_SCOPES = ["openid", "profile", "email", "User.Read"];

let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: appConfig.entraClientId,
        authority: `https://login.microsoftonline.com/${appConfig.entraTenantId}`,
        clientSecret: appConfig.entraClientSecret,
      },
    });
  }
  return msalClient;
}

export function isAuthConfigured(): boolean {
  return !!(
    appConfig.entraClientId &&
    appConfig.entraClientSecret &&
    appConfig.entraTenantId
  );
}

export async function getAuthUrl(state?: string): Promise<string> {
  const client = getMsalClient();
  const url = await client.getAuthCodeUrl({
    scopes: ENTRA_SCOPES,
    redirectUri: appConfig.entraRedirectUri,
    state,
  });
  return url;
}

export interface TokenResult {
  accessToken: string;
  externalId: string;
  displayName: string;
  email: string;
  upn: string;
  tenantId: string;
}

export async function exchangeTeamsSsoToken(
  ssoToken: string,
): Promise<TokenResult> {
  const client = getMsalClient();
  const result = await client.acquireTokenOnBehalfOf({
    oboAssertion: ssoToken,
    scopes: ["User.Read"],
  });

  if (!result) {
    throw new Error("OBO token exchange returned no result");
  }

  const claims = result.idTokenClaims as Record<string, string> | undefined;

  return {
    accessToken: result.accessToken,
    externalId: claims?.["oid"] ?? result.uniqueId,
    displayName: claims?.["name"] ?? "Teams User",
    email: claims?.["email"] ?? claims?.["preferred_username"] ?? "",
    upn: claims?.["preferred_username"] ?? claims?.["upn"] ?? "",
    tenantId: claims?.["tid"] ?? appConfig.entraTenantId,
  };
}

export async function exchangeCodeForToken(code: string): Promise<TokenResult> {
  const client = getMsalClient();
  const result = await client.acquireTokenByCode({
    code,
    scopes: ENTRA_SCOPES,
    redirectUri: appConfig.entraRedirectUri,
  });

  const claims = result.idTokenClaims as Record<string, string>;

  return {
    accessToken: result.accessToken,
    externalId: claims["oid"] ?? result.uniqueId,
    displayName: claims["name"] ?? "Unknown",
    email: claims["email"] ?? claims["preferred_username"] ?? "",
    upn: claims["preferred_username"] ?? claims["upn"] ?? "",
    tenantId: claims["tid"] ?? appConfig.entraTenantId,
  };
}

export async function getAppAccessToken(): Promise<string | null> {
  if (!isAuthConfigured()) {
    return null;
  }
  try {
    const client = getMsalClient();
    const result = await client.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    return result?.accessToken ?? null;
  } catch (err) {
    logger.error({ err }, "Failed to acquire app access token");
    return null;
  }
}

logger.info(
  { authDevMode: appConfig.authDevMode, entraConfigured: isAuthConfigured() },
  "Auth service initialized",
);

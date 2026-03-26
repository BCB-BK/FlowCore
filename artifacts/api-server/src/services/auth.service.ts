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

export interface DevUser {
  principalId: string;
  externalId: string;
  displayName: string;
  email: string;
  roles: string[];
}

const DEV_USERS: DevUser[] = [
  {
    principalId: "00000000-0000-0000-0000-000000000001",
    externalId: "dev-admin-001",
    displayName: "Dev Admin",
    email: "admin@dev.local",
    roles: ["system_admin"],
  },
  {
    principalId: "00000000-0000-0000-0000-000000000002",
    externalId: "dev-editor-001",
    displayName: "Dev Editor",
    email: "editor@dev.local",
    roles: ["editor"],
  },
  {
    principalId: "00000000-0000-0000-0000-000000000003",
    externalId: "dev-viewer-001",
    displayName: "Dev Viewer",
    email: "viewer@dev.local",
    roles: ["viewer"],
  },
  {
    principalId: "00000000-0000-0000-0000-000000000004",
    externalId: "dev-reviewer-001",
    displayName: "Dev Reviewer",
    email: "reviewer@dev.local",
    roles: ["reviewer", "approver"],
  },
  {
    principalId: "00000000-0000-0000-0000-000000000005",
    externalId: "dev-pm-001",
    displayName: "Dev Process Manager",
    email: "pm@dev.local",
    roles: ["process_manager"],
  },
];

export function getDevUsers(): DevUser[] {
  return DEV_USERS;
}

export function getDevUserById(principalId: string): DevUser | undefined {
  return DEV_USERS.find((u) => u.principalId === principalId);
}

export function getDevUserByExternalId(
  externalId: string,
): DevUser | undefined {
  return DEV_USERS.find((u) => u.externalId === externalId);
}

logger.info(
  { authDevMode: appConfig.authDevMode, entraConfigured: isAuthConfigured() },
  "Auth service initialized",
);

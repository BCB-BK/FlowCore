export interface AuthTokenResult {
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
}

export interface AuthUserInfo {
  externalId: string;
  displayName: string;
  email?: string;
  upn?: string;
  tenantId?: string;
  groups?: string[];
}

export interface IAuthProvider {
  getLoginUrl(redirectUri: string, state?: string): Promise<string>;
  handleCallback(code: string, redirectUri: string): Promise<AuthTokenResult>;
  validateToken(token: string): Promise<AuthUserInfo>;
  refreshToken(refreshToken: string): Promise<AuthTokenResult>;
  logout(sessionId: string): Promise<void>;
}

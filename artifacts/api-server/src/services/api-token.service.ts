import { db } from "@workspace/db";
import { apiTokensTable } from "@workspace/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { logger } from "../lib/logger";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createApiToken(input: {
  principalId: string;
  name: string;
  expiresAt?: Date | null;
}): Promise<{ id: string; plainToken: string }> {
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  const [row] = await db
    .insert(apiTokensTable)
    .values({
      principalId: input.principalId,
      tokenHash,
      name: input.name,
      expiresAt: input.expiresAt ?? null,
    })
    .returning({ id: apiTokensTable.id });

  return { id: row.id, plainToken };
}

export async function validateApiToken(token: string) {
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({
      id: apiTokensTable.id,
      principalId: apiTokensTable.principalId,
      expiresAt: apiTokensTable.expiresAt,
    })
    .from(apiTokensTable)
    .where(
      and(
        eq(apiTokensTable.tokenHash, tokenHash),
        or(
          isNull(apiTokensTable.expiresAt),
          gt(apiTokensTable.expiresAt, new Date()),
        ),
      ),
    );

  if (!row) {
    return null;
  }

  db.update(apiTokensTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokensTable.id, row.id))
    .then(() => {})
    .catch((err: unknown) => {
      logger.error({ err }, "Failed to update lastUsedAt for API token");
    });

  return row;
}

export async function listApiTokens(principalId: string) {
  return db
    .select({
      id: apiTokensTable.id,
      name: apiTokensTable.name,
      lastUsedAt: apiTokensTable.lastUsedAt,
      expiresAt: apiTokensTable.expiresAt,
      createdAt: apiTokensTable.createdAt,
    })
    .from(apiTokensTable)
    .where(eq(apiTokensTable.principalId, principalId));
}

export async function deleteApiToken(id: string, principalId: string) {
  const result = await db
    .delete(apiTokensTable)
    .where(
      and(
        eq(apiTokensTable.id, id),
        eq(apiTokensTable.principalId, principalId),
      ),
    )
    .returning({ id: apiTokensTable.id });

  return result.length > 0;
}

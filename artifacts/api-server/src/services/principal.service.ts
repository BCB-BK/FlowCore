import { db } from "@workspace/db";
import {
  principalsTable,
  roleAssignmentsTable,
  confidentialityPrincipalAccessTable,
  type InsertPrincipal,
} from "@workspace/db/schema";
import { eq, and, ilike, or, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function upsertPrincipal(
  input: {
    principalType: InsertPrincipal["principalType"];
    externalProvider: string;
    externalId: string;
    displayName: string;
    email?: string;
    upn?: string;
  },
  txOrDb: Pick<typeof db, "select" | "insert" | "update"> = db,
): Promise<string> {
  const providerVariants = [input.externalProvider];
  if (input.externalProvider === "entra") providerVariants.push("entra_id");
  else if (input.externalProvider === "entra_id")
    providerVariants.push("entra");

  const matches = await txOrDb
    .select({
      id: principalsTable.id,
      externalProvider: principalsTable.externalProvider,
    })
    .from(principalsTable)
    .where(
      and(
        inArray(principalsTable.externalProvider, providerVariants),
        eq(principalsTable.externalId, input.externalId),
      ),
    );

  const canonical = matches.find(
    (m) => m.externalProvider === input.externalProvider,
  );
  const existing = canonical ?? matches[0];

  if (existing) {
    await txOrDb
      .update(principalsTable)
      .set({
        displayName: input.displayName,
        email: input.email,
        upn: input.upn,
        externalProvider: input.externalProvider,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(principalsTable.id, existing.id));

    const duplicates = matches.filter((m) => m.id !== existing.id);
    for (const dup of duplicates) {
      // Merge confidentiality access grants from the duplicate to the canonical
      // before deactivating — prevents loss of access when principals are merged.
      // txOrDb statt db: Läuft der Aufruf in einer äußeren Transaktion, muss
      // der Grant-Merge bei einem Rollback mit zurückgerollt werden.
      const dupGrants = await txOrDb
        .select({ level: confidentialityPrincipalAccessTable.level })
        .from(confidentialityPrincipalAccessTable)
        .where(eq(confidentialityPrincipalAccessTable.principalId, dup.id));
      for (const grant of dupGrants) {
        await txOrDb
          .insert(confidentialityPrincipalAccessTable)
          .values({ level: grant.level, principalId: existing.id })
          .onConflictDoNothing();
      }

      await txOrDb
        .update(principalsTable)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(eq(principalsTable.id, dup.id));
      logger.info(
        {
          duplicateId: dup.id,
          canonicalId: existing.id,
          mergedGrants: dupGrants.length,
        },
        "Deactivated duplicate principal",
      );
    }

    return existing.id;
  }

  const [principal] = await txOrDb
    .insert(principalsTable)
    .values({
      principalType: input.principalType,
      externalProvider: input.externalProvider,
      externalId: input.externalId,
      displayName: input.displayName,
      email: input.email,
      upn: input.upn,
      lastSyncAt: new Date(),
    })
    .returning({ id: principalsTable.id });

  logger.info(
    { principalId: principal.id, externalId: input.externalId },
    "Principal created",
  );
  return principal.id;
}

export async function getPrincipalById(id: string) {
  const [principal] = await db
    .select()
    .from(principalsTable)
    .where(eq(principalsTable.id, id));
  return principal ?? null;
}

export async function getPrincipalByExternalId(
  provider: string,
  externalId: string,
) {
  const [principal] = await db
    .select()
    .from(principalsTable)
    .where(
      and(
        eq(principalsTable.externalProvider, provider),
        eq(principalsTable.externalId, externalId),
      ),
    );
  return principal ?? null;
}

/** Form einer Kennung; beide Arten (intern wie Entra) sind UUIDs. */
const KENNUNG_MUSTER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vereinheitlicht eine Personenangabe aus dem Formular auf die interne Kennung.
 *
 * Die Personensuche (`GET /principals/graph/people`) liefert zweierlei im selben
 * Feld `id`: bei einem Treffer aus Microsoft Graph die **Entra-Objektkennung**,
 * beim Rückfall auf den lokalen Bestand die **interne Kennung**. Was davon
 * ankommt, hängt allein daran, ob Graph gerade antwortet. Wird der Wert
 * ungeprüft gespeichert, zeigt er später ins Leere: genau so entstanden die
 * 184 unauflösbaren Eigentümerverweise, die jede Eigentümer-Anzeige mit 404
 * beantworteten — und die dazu führten, dass der Eigentümer einer vertraulichen
 * Seite nie als solcher erkannt wurde (`confidentiality.service`).
 *
 * Reihenfolge: interne Kennung → unverändert; Entra-Kennung → zugehöriger
 * Principal; in Graph bekannt, aber lokal noch nicht angelegt → wird angelegt.
 * Nicht auflösbar → `null`, damit der Aufrufer entscheiden kann.
 */
export async function resolvePrincipalReference(
  wert: string | null | undefined,
  accessToken?: string,
): Promise<string | null> {
  const kennung = wert?.trim();
  if (!kennung) return null;

  // Ohne Formprüfung liefe eine Freitexteingabe in einen Postgres-Typfehler.
  if (!KENNUNG_MUSTER.test(kennung)) {
    logger.warn({ kennung }, "Personenangabe ist keine gültige Kennung");
    return null;
  }

  const intern = await getPrincipalById(kennung);
  if (intern) return intern.id;

  // Beide Schreibweisen des Anbieters kommen im Bestand vor (Migrationsaltlast).
  const [extern] = await db
    .select({ id: principalsTable.id })
    .from(principalsTable)
    .where(
      and(
        inArray(principalsTable.externalProvider, ["entra", "entra_id"]),
        eq(principalsTable.externalId, kennung),
      ),
    );
  if (extern) return extern.id;

  if (accessToken) {
    const { getPersonById } = await import("./graph-client.service");
    const person = await getPersonById(accessToken, kennung);
    if (person?.displayName) {
      return upsertPrincipal({
        principalType: "user",
        externalProvider: "entra",
        externalId: kennung,
        displayName: person.displayName,
        email: person.mail ?? undefined,
        upn: person.userPrincipalName ?? undefined,
      });
    }
  }

  logger.warn(
    { kennung },
    "Personenangabe konnte weder lokal noch über Graph aufgelöst werden",
  );
  return null;
}

export async function searchPrincipals(query: string, limit = 20) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(principalsTable)
    .where(
      and(
        eq(principalsTable.status, "active"),
        or(
          ilike(principalsTable.displayName, pattern),
          ilike(principalsTable.email, pattern),
        ),
      ),
    )
    .limit(limit);
}

export async function listPrincipals(limit = 50, offset = 0) {
  return db
    .select()
    .from(principalsTable)
    .where(eq(principalsTable.status, "active"))
    .limit(limit)
    .offset(offset);
}

export async function getRolesForPrincipal(principalId: string) {
  return db
    .select()
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, principalId),
        eq(roleAssignmentsTable.isActive, true),
      ),
    );
}

export async function getRolesForPrincipalsBatch(principalIds: string[]) {
  if (principalIds.length === 0)
    return new Map<string, (typeof roleAssignmentsTable.$inferSelect)[]>();

  const allRoles = await db
    .select()
    .from(roleAssignmentsTable)
    .where(
      and(
        inArray(roleAssignmentsTable.principalId, principalIds),
        eq(roleAssignmentsTable.isActive, true),
      ),
    );

  const grouped = new Map<
    string,
    (typeof roleAssignmentsTable.$inferSelect)[]
  >();
  for (const id of principalIds) {
    grouped.set(id, []);
  }
  for (const role of allRoles) {
    const list = grouped.get(role.principalId);
    if (list) {
      list.push(role);
    }
  }
  return grouped;
}

export async function assignRole(
  input: {
    principalId: string;
    role: InsertPrincipal["principalType"] extends never
      ? string
      :
          | "system_admin"
          | "process_manager"
          | "editor"
          | "reviewer"
          | "approver"
          | "viewer"
          | "compliance_manager";
    scope?: string;
    grantedBy?: string;
  },
  txOrDb: Pick<typeof db, "select" | "insert"> = db,
) {
  const existing = await txOrDb
    .select({ id: roleAssignmentsTable.id })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, input.principalId),
        eq(roleAssignmentsTable.role, input.role as "system_admin"),
        eq(roleAssignmentsTable.scope, input.scope ?? "global"),
        eq(roleAssignmentsTable.isActive, true),
      ),
    );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [assignment] = await txOrDb
    .insert(roleAssignmentsTable)
    .values({
      principalId: input.principalId,
      role: input.role as "system_admin",
      scope: input.scope ?? "global",
      grantedBy: input.grantedBy,
    })
    .returning({ id: roleAssignmentsTable.id });

  logger.info(
    { principalId: input.principalId, role: input.role },
    "Role assigned",
  );
  return assignment.id;
}

/** Prüft, ob ein Principal eine aktive, nicht abgelaufene Rolle besitzt. */
export async function principalHasActiveRole(
  principalId: string,
  role:
    | "system_admin"
    | "process_manager"
    | "editor"
    | "reviewer"
    | "approver"
    | "viewer"
    | "compliance_manager",
): Promise<boolean> {
  const rows = await db
    .select({ id: roleAssignmentsTable.id })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.principalId, principalId),
        eq(roleAssignmentsTable.role, role),
        eq(roleAssignmentsTable.isActive, true),
        or(
          sql`${roleAssignmentsTable.expiresAt} IS NULL`,
          sql`${roleAssignmentsTable.expiresAt} > NOW()`,
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function revokeRole(
  assignmentId: string,
  txOrDb: Pick<typeof db, "update"> = db,
) {
  await txOrDb
    .update(roleAssignmentsTable)
    .set({ isActive: false })
    .where(eq(roleAssignmentsTable.id, assignmentId));
}

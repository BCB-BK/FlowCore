import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { principalsTable } from "./principals";
import { contentNodesTable } from "./content-nodes";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Integrationsschlüssel für die FlowCore Content-API.
 *
 * Ein Schlüssel authentifiziert ein externes System (Salesforce, Intranet,
 * ein KI-Agent …) und legt zugleich fest, welchen Ausschnitt des Wissens es
 * lesen darf. Die Freigabe wird über mehrere Dimensionen eingegrenzt, die
 * UND-verknüpft gelten:
 *
 * - `maxConfidentialityLevel` — höchste ausgelieferte Vertraulichkeitsstufe
 * - `templateTypes` — erlaubte Seitentypen (leer = alle)
 * - `brandScopes` / `agentScopes` — Marken- und Bereichszuschnitt (leer = alle)
 * - `integration_key_nodes` — Teilbäume und Einzelseiten, additiv mit
 *   Ausschlüssen (siehe dort)
 *
 * Der Klartext des Schlüssels wird nie gespeichert, nur sein SHA-256-Hash.
 * Ausgeliefert werden ausschließlich veröffentlichte Revisionen.
 */
export const integrationKeysTable = pgTable(
  "integration_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    /** Zielsystem, rein informativ (z. B. "Salesforce", "Intranet"). */
    targetSystem: varchar("target_system", { length: 100 }),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),

    maxConfidentialityLevel: varchar("max_confidentiality_level", {
      length: 32,
    })
      .notNull()
      .default("internal"),
    /** Erlaubte Seitentypen; leer bedeutet "alle Seitentypen". */
    templateTypes: text("template_types").array().notNull().default([]),
    /** Marken-Zuschnitt; leer bedeutet "alle Marken". */
    brandScopes: text("brand_scopes").array().notNull().default([]),
    /** Bereichs-Zuschnitt; leer bedeutet "alle Bereiche". */
    agentScopes: text("agent_scopes").array().notNull().default([]),

    /** Leere Liste = keine IP-Einschränkung. */
    ipAllowlist: text("ip_allowlist").array().notNull().default([]),
    /** Anfragen pro Minute je Schlüssel. */
    rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),

    revoked: boolean("revoked").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => principalsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    requestCount: integer("request_count").notNull().default(0),
  },
  (table) => [
    index("idx_integration_keys_created_by").on(table.createdBy),
    uniqueIndex("idx_integration_keys_hash").on(table.keyHash),
    index("idx_integration_keys_revoked").on(table.revoked),
  ],
);

/**
 * Struktur-Auswahl eines Schlüssels.
 *
 * `mode = "include"` nimmt einen Knoten auf, `mode = "exclude"` nimmt ihn
 * wieder heraus — Ausschlüsse gewinnen immer. Mit `includeDescendants` gilt
 * die Auswahl für den gesamten Teilbaum (ein Kernprozess mit allem darunter),
 * ohne sie nur für die eine Seite.
 *
 * Enthält ein Schlüssel überhaupt keine Include-Einträge, gilt der gesamte
 * Bestand als ausgewählt und die Eingrenzung erfolgt allein über
 * Vertraulichkeit, Seitentyp und Marke/Bereich.
 */
export const integrationKeyNodesTable = pgTable(
  "integration_key_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    keyId: uuid("key_id")
      .notNull()
      .references(() => integrationKeysTable.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => contentNodesTable.id, { onDelete: "cascade" }),
    mode: varchar("mode", { length: 16 }).notNull().default("include"),
    includeDescendants: boolean("include_descendants").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_integration_key_nodes_node").on(table.nodeId),
    index("idx_integration_key_nodes_key").on(table.keyId),
    uniqueIndex("idx_integration_key_nodes_unique").on(
      table.keyId,
      table.nodeId,
      table.mode,
    ),
  ],
);

export const insertIntegrationKeySchema = createInsertSchema(
  integrationKeysTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  requestCount: true,
});
export const selectIntegrationKeySchema =
  createSelectSchema(integrationKeysTable);
export type InsertIntegrationKey = z.infer<typeof insertIntegrationKeySchema>;
export type IntegrationKey = typeof integrationKeysTable.$inferSelect;
export type IntegrationKeyNode = typeof integrationKeyNodesTable.$inferSelect;

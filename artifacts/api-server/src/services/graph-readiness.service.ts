import { Client } from "@microsoft/microsoft-graph-client";
import { db } from "@workspace/db";
import { graphSyncStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAppAccessToken } from "./auth.service";
import { getGraphConnectorConfig } from "./graph-connector-config.service";
import { getSchemaRegisteredAt } from "./graph-schema.service";
import {
  listGroupMappings,
  GRAPH_ACL_TIERS,
} from "./graph-external-group-mapping.service";
import { isGraphSyncMockMode } from "./system-settings.service";
import { logger } from "../lib/logger";

export type ReadinessCheckStatus =
  | "ok"
  | "warning"
  | "failed"
  | "not_checkable";

export interface ReadinessCheckItem {
  key: string;
  label: string;
  status: ReadinessCheckStatus;
  message: string;
}

export interface ReadinessCheckResult {
  overall: "ready" | "not_ready" | "partial";
  checks: ReadinessCheckItem[];
}

/**
 * Copilot Studio Readiness Check: aggregates every check the DoD requires.
 * Checks that can genuinely be verified from this environment (connection,
 * schema, at least one synced test item, ACL group mappings) return
 * ok/warning/failed. Checks that require a live Microsoft Search / Copilot
 * Studio tenant we cannot reach from here (search findability, enterprise
 * connector availability) are marked "not_checkable" with an honest
 * explanation rather than a fabricated result. Tenant/license blockers are
 * surfaced whenever a Graph call along the way returns 401/403/quota-type
 * errors.
 */
export async function runReadinessCheck(): Promise<ReadinessCheckResult> {
  const checks: ReadinessCheckItem[] = [];
  let tenantBlocker: string | null = null;

  const { connectionId } = getGraphConnectorConfig();
  const mockMode = await isGraphSyncMockMode();

  // 1. Graph Connection vorhanden
  if (!connectionId) {
    checks.push({
      key: "connection",
      label: "Graph Connection vorhanden",
      status: "failed",
      message: "GRAPH_EXTERNAL_CONNECTION_ID ist nicht konfiguriert.",
    });
  } else {
    const token = await getAppAccessToken();
    if (!token) {
      checks.push({
        key: "connection",
        label: "Graph Connection vorhanden",
        status: "failed",
        message:
          "Connection ID gesetzt, aber es konnte kein Access Token bezogen werden.",
      });
    } else if (mockMode) {
      checks.push({
        key: "connection",
        label: "Graph Connection vorhanden",
        status: "warning",
        message:
          "Mock-Modus aktiv — Connection ID konfiguriert, Live-Prüfung übersprungen.",
      });
    } else {
      try {
        const client = Client.init({
          authProvider: (done) => done(null, token),
        });
        await client.api(`/external/connections/${connectionId}`).get();
        checks.push({
          key: "connection",
          label: "Graph Connection vorhanden",
          status: "ok",
          message: "External Connection ist in Microsoft Graph vorhanden.",
        });
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 401 || status === 403) {
          tenantBlocker =
            "Zugriff auf Microsoft Graph External Connections verweigert — mögliches Tenant-/Lizenz- oder Berechtigungsproblem.";
        }
        checks.push({
          key: "connection",
          label: "Graph Connection vorhanden",
          status: "failed",
          message:
            status === 404
              ? "External Connection existiert noch nicht — Schema registrieren, um sie anzulegen."
              : `Prüfung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  // 2. Schema registriert
  const schemaRegisteredAt = await getSchemaRegisteredAt();
  checks.push({
    key: "schema",
    label: "Schema registriert",
    status: schemaRegisteredAt ? "ok" : "failed",
    message: schemaRegisteredAt
      ? `Schema zuletzt registriert am ${schemaRegisteredAt}.`
      : "Schema wurde noch nicht (nicht im Dry-Run) registriert.",
  });

  // 3. Testitem synchronisiert
  const [syncedState] = await db
    .select()
    .from(graphSyncStateTable)
    .where(eq(graphSyncStateTable.lastResult, "success"))
    .limit(1);
  checks.push({
    key: "test_item_synced",
    label: "Testitem synchronisiert",
    status: syncedState ? "ok" : "failed",
    message: syncedState
      ? `Mindestens ein Item wurde erfolgreich synchronisiert (zuletzt: ${syncedState.itemId}).`
      : "Es wurde noch kein Item erfolgreich synchronisiert.",
  });

  // 4. ACL gültig
  const mappings = await listGroupMappings();
  const configuredTiers = new Set(mappings.map((m) => m.tier));
  const missingTiers = GRAPH_ACL_TIERS.filter((t) => !configuredTiers.has(t));
  checks.push({
    key: "acl_valid",
    label: "ACL gültig",
    status: missingTiers.length === 0 ? "ok" : "warning",
    message:
      missingTiers.length === 0
        ? "Alle ACL-Stufen (internal_standard/restricted/executive) sind einer Entra-Gruppe zugeordnet."
        : `Fehlende Gruppen-Zuordnung für: ${missingTiers.join(", ")}.`,
  });

  // 5. Microsoft Search findet Testitem, falls prüfbar
  checks.push({
    key: "search_findable",
    label: "Microsoft Search findet Testitem",
    status: "not_checkable",
    message:
      "Nicht automatisiert prüfbar: Microsoft Search benötigt eine manuelle Suche im Microsoft-365-Tenant (Suchindex-Latenz, keine öffentliche Such-API für externalItems verfügbar).",
  });

  // 6. Enterprise-data-Connector in Copilot Studio verfügbar, falls prüfbar
  checks.push({
    key: "copilot_studio_connector_available",
    label: "Enterprise-data-Connector in Copilot Studio verfügbar",
    status: "not_checkable",
    message:
      "Nicht programmatisch prüfbar: Copilot Studio bietet keine Graph-API, um die Sichtbarkeit eines 'Enterprise data'-Konnektors abzufragen. Bitte manuell im Copilot Studio Admin Center prüfen.",
  });

  // 7. Tenant-/Lizenzblocker, falls erkennbar
  checks.push({
    key: "tenant_license_blocker",
    label: "Tenant-/Lizenzblocker",
    status: tenantBlocker ? "failed" : "ok",
    message:
      tenantBlocker ??
      "Keine Tenant- oder Lizenzblocker während der Prüfung erkannt.",
  });

  const hasFailed = checks.some((c) => c.status === "failed");
  const hasWarning = checks.some((c) => c.status === "warning");
  const overall: ReadinessCheckResult["overall"] = hasFailed
    ? "not_ready"
    : hasWarning
      ? "partial"
      : "ready";

  logger.info(
    { overall, checks: checks.map((c) => `${c.key}:${c.status}`) },
    "Graph readiness check completed",
  );

  return { overall, checks };
}

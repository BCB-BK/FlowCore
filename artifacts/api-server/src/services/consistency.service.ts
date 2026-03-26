import { pool } from "@workspace/db";
import * as schema from "@workspace/db";
import { getTableName, is, Table } from "drizzle-orm";

export interface ConsistencyCheckResult {
  category: string;
  item: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
}

export interface ConsistencyReport {
  timestamp: string;
  checks: ConsistencyCheckResult[];
  summary: {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
  };
}

function getWorkspaceRoot(): string {
  const path = require("path");
  if (process.env["WORKSPACE_ROOT"]) return process.env["WORKSPACE_ROOT"];
  if (process.env["REPL_HOME"]) return path.join(process.env["REPL_HOME"], "workspace");
  return path.resolve(__dirname, "../../../../..");
}

function getExpectedTablesFromSchema(): string[] {
  const tables: string[] = [];
  for (const value of Object.values(schema)) {
    if (is(value, Table)) {
      tables.push(getTableName(value));
    }
  }
  return [...new Set(tables)].sort();
}

async function checkDatabaseConnection(): Promise<ConsistencyCheckResult> {
  try {
    const r = await pool.query("SELECT 1 as check");
    if (r.rows.length === 1) {
      return {
        category: "Datenbank",
        item: "Verbindung",
        status: "ok",
        message: "Datenbankverbindung aktiv",
      };
    }
    return {
      category: "Datenbank",
      item: "Verbindung",
      status: "error",
      message: "Datenbankabfrage fehlgeschlagen",
    };
  } catch (err) {
    return {
      category: "Datenbank",
      item: "Verbindung",
      status: "error",
      message: "Datenbankverbindung nicht möglich",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkExpectedTables(): Promise<ConsistencyCheckResult[]> {
  const expectedTables = getExpectedTablesFromSchema();

  const results: ConsistencyCheckResult[] = [];

  try {
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const existingTables = new Set(
      r.rows.map((row: Record<string, string>) => row.table_name),
    );

    for (const table of expectedTables) {
      if (existingTables.has(table)) {
        results.push({
          category: "Schema",
          item: `Tabelle: ${table}`,
          status: "ok",
          message: `Tabelle '${table}' existiert`,
        });
      } else {
        results.push({
          category: "Schema",
          item: `Tabelle: ${table}`,
          status: "error",
          message: `Tabelle '${table}' fehlt in der Datenbank`,
          details:
            "Schema-Drift: Die Tabelle ist im Code definiert, aber nicht in der Datenbank vorhanden. Bitte drizzle-kit push ausführen.",
        });
      }
    }

    const codeTableSet = new Set(expectedTables);
    for (const existing of existingTables) {
      if (!codeTableSet.has(existing as string) && !(existing as string).startsWith("drizzle_")) {
        results.push({
          category: "Schema",
          item: `Tabelle: ${existing}`,
          status: "warning",
          message: `Tabelle '${existing}' existiert in der DB, aber nicht im Code-Schema`,
          details:
            "Möglicherweise veraltet oder manuell erstellt. Prüfen, ob Migration nötig.",
        });
      }
    }
  } catch (err) {
    results.push({
      category: "Schema",
      item: "Tabellenprüfung",
      status: "error",
      message: "Tabellenprüfung fehlgeschlagen",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

async function checkRequiredExtensions(): Promise<ConsistencyCheckResult[]> {
  const requiredExtensions = ["pg_trgm"];
  const results: ConsistencyCheckResult[] = [];

  try {
    const r = await pool.query(
      `SELECT extname FROM pg_extension WHERE extname = ANY($1)`,
      [requiredExtensions],
    );
    const installed = new Set(
      r.rows.map((row: Record<string, string>) => row.extname),
    );

    for (const ext of requiredExtensions) {
      results.push({
        category: "Datenbank",
        item: `Erweiterung: ${ext}`,
        status: installed.has(ext) ? "ok" : "warning",
        message: installed.has(ext)
          ? `Erweiterung '${ext}' installiert`
          : `Erweiterung '${ext}' nicht installiert`,
        details: installed.has(ext)
          ? undefined
          : "Volltext-Suche ist möglicherweise eingeschränkt.",
      });
    }
  } catch {
    results.push({
      category: "Datenbank",
      item: "Erweiterungsprüfung",
      status: "warning",
      message: "Erweiterungsprüfung fehlgeschlagen",
    });
  }

  return results;
}

function checkEnvironmentConfig(): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];

  const required: [string, string][] = [
    ["DATABASE_URL", "Datenbankverbindung"],
    ["PORT", "Server-Port"],
  ];

  const recommended: [string, string][] = [
    ["SESSION_SECRET", "Session-Geheimnis"],
    ["ENTRA_CLIENT_ID", "Entra ID Client"],
    ["ENTRA_TENANT_ID", "Entra ID Tenant"],
  ];

  for (const [key, label] of required) {
    const val = process.env[key];
    results.push({
      category: "Konfiguration",
      item: label,
      status: val ? "ok" : "error",
      message: val ? `${label} konfiguriert` : `${label} fehlt (${key})`,
    });
  }

  for (const [key, label] of recommended) {
    const val = process.env[key];
    results.push({
      category: "Konfiguration",
      item: label,
      status: val ? "ok" : "warning",
      message: val
        ? `${label} konfiguriert`
        : `${label} nicht konfiguriert (${key})`,
    });
  }

  const nodeEnv = process.env["NODE_ENV"] || "development";
  const sessionSecret = process.env["SESSION_SECRET"] || "";
  if (
    nodeEnv === "production" &&
    (sessionSecret === "dev-session-secret-change-me" || !sessionSecret)
  ) {
    results.push({
      category: "Sicherheit",
      item: "Session-Secret",
      status: "error",
      message:
        "SESSION_SECRET hat einen unsicheren Standardwert in Produktion",
    });
  }

  if (nodeEnv === "production" && process.env["AUTH_DEV_MODE"] === "true") {
    results.push({
      category: "Sicherheit",
      item: "Auth-Entwicklermodus",
      status: "error",
      message: "AUTH_DEV_MODE ist in Produktion aktiviert",
    });
  }

  return results;
}

function checkDocumentation(): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];
  const fs = require("fs");
  const path = require("path");

  const requiredDocs = [
    "docs/01-ARCHITECTURE.md",
    "docs/00-INDEX.md",
    "docs/05-CONFIG-ENV.md",
    "docs/11-RUNBOOKS.md",
    "docs/14-GO-LIVE-CHECKLIST.md",
    "docs/15-SOURCE-OF-TRUTH.md",
    "CHANGELOG.md",
    "audit-docs/01_SYSTEMUEBERSICHT.md",
  ];

  const workspaceRoot = getWorkspaceRoot();

  for (const doc of requiredDocs) {
    const fullPath = path.join(workspaceRoot, doc);
    const exists = fs.existsSync(fullPath);
    results.push({
      category: "Dokumentation",
      item: doc,
      status: exists ? "ok" : "warning",
      message: exists ? `${doc} vorhanden` : `${doc} fehlt`,
    });
  }

  return results;
}

async function checkBackupStatus(): Promise<ConsistencyCheckResult> {
  try {
    const r = await pool.query(
      `SELECT status, completed_at FROM backup_runs ORDER BY created_at DESC LIMIT 1`,
    );
    if (r.rows.length === 0) {
      return {
        category: "Betrieb",
        item: "Backup",
        status: "warning",
        message: "Kein Backup-Lauf gefunden",
        details: "Es wurde noch kein Backup durchgeführt.",
      };
    }
    const run = r.rows[0] as Record<string, unknown>;
    if (run.status === "completed") {
      return {
        category: "Betrieb",
        item: "Backup",
        status: "ok",
        message: `Letztes Backup erfolgreich (${run.completed_at})`,
      };
    }
    return {
      category: "Betrieb",
      item: "Backup",
      status: "warning",
      message: `Letztes Backup: Status '${run.status}'`,
    };
  } catch {
    return {
      category: "Betrieb",
      item: "Backup",
      status: "warning",
      message: "Backup-Status konnte nicht geprüft werden",
    };
  }
}

async function checkReleaseStatus(): Promise<ConsistencyCheckResult> {
  try {
    const r = await pool.query(
      `SELECT status, version, title FROM releases ORDER BY created_at DESC LIMIT 1`,
    );
    if (r.rows.length === 0) {
      return {
        category: "Release",
        item: "Letzter Release",
        status: "warning",
        message: "Kein Release registriert",
      };
    }
    const rel = r.rows[0] as Record<string, string>;
    return {
      category: "Release",
      item: "Letzter Release",
      status: rel.status === "released" ? "ok" : "warning",
      message: `${rel.title} (${rel.version}): ${rel.status}`,
    };
  } catch {
    return {
      category: "Release",
      item: "Letzter Release",
      status: "warning",
      message: "Release-Status konnte nicht geprüft werden",
    };
  }
}

function checkBuildArtifacts(): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];
  const fs = require("fs");
  const path = require("path");

  const workspaceRoot = getWorkspaceRoot();

  const apiDist = path.join(workspaceRoot, "artifacts/api-server/dist/index.mjs");
  if (fs.existsSync(apiDist)) {
    const distStat = fs.statSync(apiDist);
    const srcDir = path.join(workspaceRoot, "artifacts/api-server/src");
    let newerSrcExists = false;
    try {
      const srcFiles = fs.readdirSync(srcDir, { recursive: true }) as string[];
      for (const file of srcFiles) {
        const fullPath = path.join(srcDir, file);
        try {
          const srcStat = fs.statSync(fullPath);
          if (srcStat.isFile() && srcStat.mtimeMs > distStat.mtimeMs) {
            newerSrcExists = true;
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      newerSrcExists = false;
    }

    results.push({
      category: "Build-Konsistenz",
      item: "API-Server Build",
      status: newerSrcExists ? "warning" : "ok",
      message: newerSrcExists
        ? "Quelldateien sind neuer als der letzte Build – Rebuild empfohlen"
        : "Build ist aktuell",
      details: newerSrcExists
        ? "Laufender Server könnte veraltet sein. Workflow-Neustart oder Build erforderlich."
        : undefined,
    });
  } else {
    results.push({
      category: "Build-Konsistenz",
      item: "API-Server Build",
      status: "error",
      message: "Kein Build-Artefakt gefunden (dist/index.mjs)",
      details: "API-Server wurde noch nicht gebaut oder Build-Artefakte fehlen.",
    });
  }

  return results;
}

function checkCodegenFreshness(): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];
  const fs = require("fs");
  const path = require("path");

  const workspaceRoot = getWorkspaceRoot();

  const specFile = path.join(workspaceRoot, "lib/api-spec/openapi.yaml");
  const generatedDir = path.join(workspaceRoot, "lib/api-zod/src");

  try {
    if (fs.existsSync(specFile) && fs.existsSync(generatedDir)) {
      const specStat = fs.statSync(specFile);
      const genFiles = fs.readdirSync(generatedDir) as string[];
      const genFile = genFiles.find((f: string) => f.endsWith(".ts") || f.endsWith(".zod.ts"));
      if (genFile) {
        const genStat = fs.statSync(path.join(generatedDir, genFile));
        const specNewer = specStat.mtimeMs > genStat.mtimeMs;
        results.push({
          category: "Build-Konsistenz",
          item: "OpenAPI Codegen",
          status: specNewer ? "warning" : "ok",
          message: specNewer
            ? "OpenAPI-Spec ist neuer als generierte Dateien – Codegen empfohlen"
            : "Generierte Dateien sind aktuell",
          details: specNewer
            ? "Führen Sie 'pnpm --filter @workspace/api-spec run codegen' aus, um die generierten Clients zu aktualisieren."
            : undefined,
        });
      } else {
        results.push({
          category: "Build-Konsistenz",
          item: "OpenAPI Codegen",
          status: "warning",
          message: "Keine generierten TypeScript-Dateien gefunden",
        });
      }
    } else {
      if (!fs.existsSync(specFile)) {
        results.push({
          category: "Build-Konsistenz",
          item: "OpenAPI Spec",
          status: "error",
          message: "OpenAPI-Spezifikation fehlt (lib/api-spec/openapi.yaml)",
        });
      }
    }
  } catch {
    results.push({
      category: "Build-Konsistenz",
      item: "OpenAPI Codegen",
      status: "warning",
      message: "Codegen-Prüfung fehlgeschlagen",
    });
  }

  return results;
}

async function checkReleaseSyncConsistency(): Promise<ConsistencyCheckResult[]> {
  const results: ConsistencyCheckResult[] = [];

  try {
    const r = await pool.query(
      `SELECT id, title, version, status, synced_at, released_at
       FROM releases
       WHERE status NOT IN ('revoked')
       ORDER BY created_at DESC
       LIMIT 5`,
    );

    for (const row of r.rows as Record<string, unknown>[]) {
      if (row.status === "released" && !row.synced_at) {
        results.push({
          category: "Sync-Konsistenz",
          item: `Release: ${row.title} (${row.version})`,
          status: "error",
          message: "Release wurde freigegeben ohne bestätigten GitHub-Sync",
          details:
            "Laut Release-Pfad muss der Sync vor der Freigabe abgeschlossen sein.",
        });
      } else if (
        row.status === "audit_passed" ||
        row.status === "sync_pending"
      ) {
        results.push({
          category: "Sync-Konsistenz",
          item: `Release: ${row.title} (${row.version})`,
          status: "warning",
          message: `Release wartet auf ${row.status === "audit_passed" ? "GitHub-Sync" : "Sync-Bestätigung"}`,
          details: "Release-Pfad noch nicht abgeschlossen.",
        });
      }
    }

    const pendingCount = r.rows.filter(
      (row: Record<string, unknown>) =>
        row.status !== "released" && row.status !== "revoked",
    ).length;
    if (pendingCount > 0) {
      results.push({
        category: "Sync-Konsistenz",
        item: "Offene Releases",
        status: "warning",
        message: `${pendingCount} Release(s) noch nicht abgeschlossen`,
      });
    } else if (r.rows.length > 0) {
      results.push({
        category: "Sync-Konsistenz",
        item: "Release-Pipeline",
        status: "ok",
        message: "Alle aktuellen Releases sind abgeschlossen",
      });
    }
  } catch {
    results.push({
      category: "Sync-Konsistenz",
      item: "Release-Sync-Prüfung",
      status: "warning",
      message: "Sync-Konsistenzprüfung fehlgeschlagen",
    });
  }

  return results;
}

function checkMigrationFiles(): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];
  const fs = require("fs");
  const path = require("path");

  const workspaceRoot = getWorkspaceRoot();

  const drizzleDir = path.join(workspaceRoot, "lib/db/drizzle");
  try {
    if (fs.existsSync(drizzleDir)) {
      const files = (fs.readdirSync(drizzleDir) as string[]).filter((f: string) =>
        f.endsWith(".sql"),
      );
      results.push({
        category: "Build-Konsistenz",
        item: "DB-Migrationen",
        status: files.length > 0 ? "ok" : "warning",
        message:
          files.length > 0
            ? `${files.length} Migrationsdatei(en) vorhanden`
            : "Keine SQL-Migrationsdateien gefunden",
        details:
          files.length > 0
            ? `Dateien: ${files.join(", ")}`
            : "Erstellen Sie Migrationen mit 'drizzle-kit generate'.",
      });
    } else {
      results.push({
        category: "Build-Konsistenz",
        item: "DB-Migrationen",
        status: "warning",
        message: "Migrationsverzeichnis fehlt (lib/db/drizzle/)",
      });
    }
  } catch {
    results.push({
      category: "Build-Konsistenz",
      item: "DB-Migrationen",
      status: "warning",
      message: "Migrationsprüfung fehlgeschlagen",
    });
  }

  return results;
}

export async function runConsistencyCheck(): Promise<ConsistencyReport> {
  const checks: ConsistencyCheckResult[] = [];

  const dbConn = await checkDatabaseConnection();
  checks.push(dbConn);

  if (dbConn.status === "ok") {
    const tableChecks = await checkExpectedTables();
    checks.push(...tableChecks);

    const extChecks = await checkRequiredExtensions();
    checks.push(...extChecks);

    const backupCheck = await checkBackupStatus();
    checks.push(backupCheck);

    const releaseCheck = await checkReleaseStatus();
    checks.push(releaseCheck);

    const syncChecks = await checkReleaseSyncConsistency();
    checks.push(...syncChecks);
  }

  const envChecks = checkEnvironmentConfig();
  checks.push(...envChecks);

  const docChecks = checkDocumentation();
  checks.push(...docChecks);

  const buildChecks = checkBuildArtifacts();
  checks.push(...buildChecks);

  const codegenChecks = checkCodegenFreshness();
  checks.push(...codegenChecks);

  const migrationChecks = checkMigrationFiles();
  checks.push(...migrationChecks);

  const summary = {
    total: checks.length,
    ok: checks.filter((c) => c.status === "ok").length,
    warnings: checks.filter((c) => c.status === "warning").length,
    errors: checks.filter((c) => c.status === "error").length,
  };

  return {
    timestamp: new Date().toISOString(),
    checks,
    summary,
  };
}

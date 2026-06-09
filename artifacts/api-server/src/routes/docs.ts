import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/require-auth";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

interface DocEntry {
  filename: string;
  title: string;
  description: string;
  isHandbook?: boolean;
}

const DOCS_CATALOG: DocEntry[] = [
  {
    filename: "10-ADMIN-HANDBOOK.md",
    title: "Administrationshandbuch",
    description:
      "Vollständiges Handbuch für Systemadministratoren: Konfiguration, Benutzerverwaltung, Konnektoren, Backup-System, Sicherheit und Wartung.",
    isHandbook: true,
  },
  {
    filename: "22-QUICK-START.md",
    title: "Quick-Start",
    description:
      "Schnelleinstieg für neue Nutzer: Anmeldung, erste Schritte und grundlegende Navigation in 5 Minuten.",
  },
  {
    filename: "20-EDITOR-GUIDE.md",
    title: "Editor-Leitfaden",
    description:
      "Anleitungen zur Inhaltserstellung: Block-Editor, BPMN-Diagramme, KI-Assistent und SharePoint-Integration.",
  },
  {
    filename: "21-REVIEWER-GUIDE.md",
    title: "Reviewer-Leitfaden",
    description:
      "Prüf- und Freigabeworkflow: Wie Inhalte reviewed, kommentiert und freigegeben werden.",
  },
  {
    filename: "01-ARCHITECTURE.md",
    title: "Systemarchitektur",
    description:
      "Technische Architektur: Stack, Deployment, Systemkomponenten und Datenflüsse.",
  },
  {
    filename: "02-DATA-MODEL.md",
    title: "Datenmodell",
    description:
      "Datenbankschema, Entitäten und deren Beziehungen im Überblick.",
  },
  {
    filename: "03-BENCHMARK-FEATURE-REGISTER.md",
    title: "Feature-Register",
    description:
      "Vollständiges Register aller Features mit aktuellem Implementierungsstand (94 % abgeschlossen).",
  },
  {
    filename: "05-CONFIG-ENV.md",
    title: "Konfiguration & Umgebungsvariablen",
    description:
      "Alle Umgebungsvariablen, Secrets und Konfigurationsparameter – inkl. Entra-SSO und SharePoint.",
  },
  {
    filename: "06-LOGGING-AUDIT.md",
    title: "Logging & Audit",
    description:
      "Protokollierungsstrategie, strukturiertes Logging mit Pino und Audit-Trail-Konzept.",
  },
  {
    filename: "11-RUNBOOKS.md",
    title: "Runbooks",
    description:
      "Betriebsverfahren für häufige Szenarien: Server-Neustart, Datenbankprobleme, Backup-Wiederherstellung.",
  },
  {
    filename: "12-BACKUP-RESTORE.md",
    title: "Backup & Wiederherstellung",
    description:
      "SharePoint-Backup-System: Konfiguration, manuelle und automatische Sicherungen sowie Restore-Prozesse.",
  },
  {
    filename: "13-PERFORMANCE.md",
    title: "Performance & Kapazität",
    description:
      "Systemanforderungen, Performance-Optimierung und Kapazitätsplanung für den Produktionsbetrieb.",
  },
  {
    filename: "14-GO-LIVE-CHECKLIST.md",
    title: "Go-Live-Checkliste",
    description:
      "Vollständige Checkliste für den Produktionsstart: von Konfiguration über Sicherheit bis zur Abnahme.",
  },
  {
    filename: "15-SOURCE-OF-TRUTH.md",
    title: "Source of Truth",
    description:
      "Datenquellen und Referenzarchitektur für Systemkonsistenz und Datenintegrität.",
  },
  {
    filename: "23-UAT-PROTOCOL.md",
    title: "UAT-Protokoll",
    description:
      "User-Acceptance-Test-Protokoll: Abnahmetests, Testszenarien und Akzeptanzkriterien.",
  },
  {
    filename: "00-INDEX.md",
    title: "Dokumentations-Index",
    description:
      "Gesamtübersicht aller Dokumente mit Schnellzugriff, Status und Audit-Hinweisen.",
  },
];

function getDocsRoot(): string {
  const replHome = process.env["REPL_HOME"] ?? "";
  const candidates = [
    path.join(replHome, "docs"),
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "../../../docs"),
    path.join(process.cwd(), "../../../../docs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(replHome, "docs");
}

function readDoc(filename: string): string | null {
  const docsRoot = getDocsRoot();
  const safe = path.basename(filename);
  const filePath = path.join(docsRoot, safe);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

router.get("/docs", requireAuth, (_req, res) => {
  const docsRoot = getDocsRoot();
  const entries = DOCS_CATALOG.map((doc) => {
    const filePath = path.join(docsRoot, doc.filename);
    const exists = fs.existsSync(filePath);
    const stat = exists ? fs.statSync(filePath) : null;
    return {
      ...doc,
      exists,
      sizeBytes: stat?.size ?? 0,
      lastModified: stat?.mtime?.toISOString() ?? null,
    };
  });
  res.json({ docs: entries });
});

router.get("/docs/:filename", requireAuth, (req, res) => {
  const filename = String(req.params["filename"] ?? "");
  if (!filename || !filename.endsWith(".md")) {
    res.status(400).json({ error: "Ungültiger Dateiname" });
    return;
  }
  const content = readDoc(filename);
  if (content === null) {
    res.status(404).json({ error: "Dokument nicht gefunden" });
    return;
  }
  res.json({ filename, content });
});

router.get("/docs-export/all", requireAuth, async (req, res) => {
  const docsRoot = getDocsRoot();
  const docs: Record<string, string> = {};

  for (const entry of DOCS_CATALOG) {
    const content = readDoc(entry.filename);
    if (content !== null) {
      docs[entry.filename] = content;
    }
  }

  const extraFiles = ["TECH-LOG.md", "MIGRATION-MATRIX.md", "E2E-ACCEPTANCE.md"];
  for (const f of extraFiles) {
    const content = readDoc(f);
    if (content !== null) docs[f] = content;
  }

  let settings: Record<string, unknown> = {};
  try {
    const { getAllSystemSettings } = await import("../services/system-settings.service");
    settings = await getAllSystemSettings();
  } catch {
    settings = { error: "Einstellungen konnten nicht geladen werden" };
  }

  let dbInfo: Record<string, unknown> = {};
  try {
    const { pool } = await import("@workspace/db");
    const r = await pool.query(
      "SELECT version() as version, current_database() as dbname",
    );
    dbInfo = r.rows[0] as Record<string, unknown>;
  } catch {
    dbInfo = { error: "Datenbankinfo nicht verfügbar" };
  }

  const exportData = {
    exportMeta: {
      exportedAt: new Date().toISOString(),
      exportedBy: (req as unknown as Record<string, unknown>)["principal"]
        ? String(
            (
              (req as unknown as Record<string, unknown>)[
                "principal"
              ] as Record<string, unknown>
            )["displayName"] ?? "Unbekannt",
          )
        : "Unbekannt",
      version: "FlowCore v0.4",
      docsCount: Object.keys(docs).length,
    },
    documentation: docs,
    systemSettings: settings,
    databaseInfo: dbInfo,
  };

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="flowcore-export-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.setHeader("Content-Type", "application/json");
  res.json(exportData);
});

export { router as docsRouter };

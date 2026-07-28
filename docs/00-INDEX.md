# FlowCore – Dokumentations-Index

**Stand**: Juni 2026 | **Produktions-URL**: `https://flowcore.bildungscampus-backnang.de`

---

## Architektur & Design

- [01 – Architektur](./01-ARCHITECTURE.md) — Technologie-Stack, Systemarchitektur, Module, Sicherheit
- [02 – Datenmodell](./02-DATA-MODEL.md) — Entity-Beziehungen, Tabellen, Dual-ID-System, State Machine
- [03 – Feature Register](./03-BENCHMARK-FEATURE-REGISTER.md) — Implementierungsstand aller Features (94 % umgesetzt)
- [05 – Konfiguration & Umgebungsvariablen](./05-CONFIG-ENV.md) — Alle Env-Vars, Credential-Logik, Health-Check
- [06 – Logging & Audit](./06-LOGGING-AUDIT.md) — Logging-Strategie, Audit-Events, Datenbankschema

## Architecture Decision Records

- [ADR-001 – Current State](./adr/ADR-001-current-state.md)
- [ADR-002 – Dual ID System](./adr/ADR-002-dual-id-system.md)
- [ADR-003 – Revision/Version Model](./adr/ADR-003-revision-version-model.md)
- [ADR-004 – Wouter Routing](./adr/ADR-004-wouter-routing.md)
- [ADR-005 – Eigenentwicklung auf Replit](./adr/ADR-005-eigenentwicklung-replit.md)
- [ADR-006 – Campus-first / Multi-Org](./adr/ADR-006-campus-first-multi-org.md)
- [ADR-007 – Provider-Abstraktionsstrategie](./adr/ADR-007-provider-abstraction-strategy.md)

## Betrieb & Deployment

- [10 – Administrationshandbuch](./10-ADMIN-HANDBOOK.md) — Benutzerverwaltung, Konnektoren, Backup, Sicherheit, Wartung
- [11 – Runbooks](./11-RUNBOOKS.md) — Betriebsverfahren für häufige Incidents
- [12 – Backup & Restore](./12-BACKUP-RESTORE.md) — Eingebautes SharePoint-Backup-System, Wiederherstellung
- [13 – Performance & Kapazität](./13-PERFORMANCE.md)
- [14 – Go-Live-Checkliste](./14-GO-LIVE-CHECKLIST.md) — Alle Voraussetzungen für Produktionsbetrieb inkl. Entra-Berechtigungen
- [15 – Source of Truth](./15-SOURCE-OF-TRUTH.md)

## Copilot Studio Integration

- [Agent-Setup](./copilot-studio/flowcore-agent-setup.md) — Schritt-für-Schritt-Anleitung zur Konfiguration eines Copilot-Studio-Agenten mit dem FlowCore Graph Connector als Wissensquelle, inkl. Tenant-/Lizenz-Blocker-Dokumentation
- [Agent-Anweisung](./copilot-studio/flowcore-agent-instructions.md) — Kopiervorlage für die Instructions des Agenten inkl. Priorisierungslogik (authority_level, source_priority, decision_status, confidentiality)
- [Testfragen](./copilot-studio/flowcore-testfragen.md) — Testfragen zur Abnahme (Positiv- und Negativfälle gegen Halluzination)

## Schnittstellen

- [30 – Content-API & Integrationsschlüssel](./30-CONTENT-API.md) — Lesender Zugriff für Fremdsysteme (Salesforce, Intranet, Portale): Freigabe nach Vertraulichkeit, Seitentypen, Kernprozessen und Einzelseiten, Endpunkte, Synchronisation, Fehlerbilder

## Benutzerhandbücher

- [20 – Editor-Leitfaden](./20-EDITOR-GUIDE.md) — Seiten erstellen, Block-Editor, BPMN, Medien, KI-Assistent, Revisionen
- [21 – Reviewer-/Genehmiger-Leitfaden](./21-REVIEWER-GUIDE.md) — Review-Workflow, Prüfkriterien, Qualitäts-Dashboard
- [22 – Schnellstart](./22-QUICK-START.md) — Erste Schritte in 5 Minuten
- [23 – UAT-Protokoll](./23-UAT-PROTOCOL.md)

## Prozess & Standards

- [96 – Agent Playbook](./96-AGENT-PLAYBOOK.md)

## Templates

- [Cluster-Report-Vorlage](./templates/CLUSTER-REPORT-TEMPLATE.md)

## Migration & Abnahme

- [Migrations-Matrix](./MIGRATION-MATRIX.md)
- [E2E-Abnahmeprotokoll](./E2E-ACCEPTANCE.md)

## Berichte

- [Cluster 1 Report](./reports/CLUSTER-1-REPORT.md)
- [Cluster 1 Audit](./reports/CLUSTER-1-AUDIT.md)
- [Cluster 2 Report](./reports/CLUSTER-2-REPORT.md)
- [Cluster 2 Audit](./reports/CLUSTER-2-AUDIT.md)
- [Cluster 33 Report](./reports/CLUSTER-33-REPORT.md)

## Provider-Abstraktionen

- [`lib/shared/src/providers/`](../lib/shared/src/providers/) — TypeScript-Interfaces für Auth, Storage, Search, AI, Connector, Notification Provider

## Sonstiges

- [Changelog](../CHANGELOG.md)
- [Tech-Log](./TECH-LOG.md)

---

## Schnellübersicht für Audit

| Thema | Dokument |
|---|---|
| Was ist das System? | [01 – Architektur](./01-ARCHITECTURE.md) |
| Welche Daten werden gespeichert? | [02 – Datenmodell](./02-DATA-MODEL.md) |
| Welche Features sind umgesetzt? | [03 – Feature Register](./03-BENCHMARK-FEATURE-REGISTER.md) |
| Wie wird konfiguriert? | [05 – Konfiguration](./05-CONFIG-ENV.md) |
| Wie werden Logs/Audit-Events gespeichert? | [06 – Logging & Audit](./06-LOGGING-AUDIT.md) |
| Wie wird administriert? | [10 – Administrationshandbuch](./10-ADMIN-HANDBOOK.md) |
| Wie werden Daten gesichert? | [12 – Backup & Restore](./12-BACKUP-RESTORE.md) |
| Wie wird das System benutzt? | [20 – Editor-Leitfaden](./20-EDITOR-GUIDE.md) |
| Was muss vor Go-Live erledigt sein? | [14 – Go-Live-Checkliste](./14-GO-LIVE-CHECKLIST.md) |

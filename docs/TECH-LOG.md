# Tech Log

Operational and technical notes, incidents, and decisions recorded chronologically.

## 2026-03-27 – Cluster 33: Regression, Migration und formale Abnahme

- **Migrationsmatrix erstellt**: Vollständige Mapping-Tabelle aller 18 Seitentypen auf neue strukturierte Felder, inkl. 6 Compound-Typen (sipoc_cards, raci_matrix, qa_repeater, term_repeater, check_items, competency_areas)
- **Fallback-Strategie definiert**: 3-Phasen-Migration (keine Breaking Changes → optionale Konvertierung → Batch-Migration), Garantie gegen stille Datenverluste durch Beibehaltung unbekannter Keys, Revisionsimmutabilität, Audit-Trail
- **Diff-Rendering für Compound-Typen**: `detectCompoundType()` erkennt Datenstrukturen automatisch; `formatCompoundForDisplay()` rendert SIPOC als S/I/P/O/C-Zeilen, RACI als Rollen×Aktivitäten, Q&A als nummerierte Paare, Terme mit Synonymen, Checklisten mit Checkboxen, Kompetenzen mit Skills
- **RevisionDiffView erweitert**: Compound-Typ-Badge (blau) im Diff-Header, Abschnittsüberschrift von "Governance-Felder" auf "Strukturierte Felder" korrigiert
- **Feldlabels erweitert**: 30+ neue deutsche Übersetzungen in `formatFieldLabel()` für alle Abschnittsnamen und Compound-Felder
- **E2E-Abnahmeprotokoll**: 48 Prüfpunkte in 7 Kategorien dokumentiert, alle als "Implementiert" bestätigt, keine Regressionen
- **Dokumentation aktualisiert**: CHANGELOG, TECH-LOG, Clusterreport, Migrationsmatrix, E2E-Abnahmeprotokoll

## 2026-03-25 – Cluster 1 Setup

- **Repo audit completed**: Express 5 + Drizzle ORM + OpenAPI codegen stack confirmed as foundation
- **Config validation**: Zod-based config schema added with fail-fast behavior
- **Audit table**: `audit_events` table created in PostgreSQL via Drizzle
- **Correlation IDs**: Added via middleware, propagated through pino-http
- **Quality gates**: lint, typecheck, test, e2e, no-hardcode-check, docs:check scripts added
- **Playwright**: E2E test infrastructure installed with base tests
- **Documentation**: ADR structure, changelog, tech log, and playbook established

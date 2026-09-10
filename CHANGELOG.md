# Changelog

All notable changes to the Enterprise Wiki project.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed
- Abgelaufene Sitzung wird wieder als solche erkannt (gemeldet 10.09.2026 aus der Review-Inbox). Der API-Client wertete einen 401 nur dann als Sitzungsende, wenn die Servermeldung woertlich "session invalidated" enthielt — das sendet der Server aber nur beim Entzug der Entra-Gruppe (`middlewares/require-auth.ts`). Der haeufigste Fall, die nach `SESSION_MAX_AGE_HOURS` (Vorgabe 8 h) abgelaufene Sitzung, meldet `Authentication required` und wurde uebergangen: Die Oberflaeche zeigte weiter zwischengespeicherte Inhalte und quittierte jede Aktion mit einem rohen "HTTP 401 Unauthorized", statt zur Anmeldung zu fuehren. Belegt im PROD-Protokoll — der `GET` auf die Loeschanfragen lieferte bereits 401, waehrend die Liste noch angezeigt wurde.
- Jetzt fuehrt jeder 401 zur Anmeldeseite, mit **einer** Ausnahme: die Anmeldeprobe `/api/auth/me`. Deren 401 ist vor der Anmeldung der Normalzustand — `AuthGate` zeigt darauf die Anmeldeseite. Ohne diese Ausnahme haette die Anmeldeseite sich endlos neu geladen. Dazu eine Einmal-Sperre, damit mehrere gleichzeitig scheiternde Anfragen nicht mehrfach umleiten. Abgesichert mit 6 Tests in `artifacts/wiki-frontend/src/lib/sitzungsende.test.ts`, darunter die Gegenprobe gegen die Schleife.

### Added
- Editor- und Medienverbesserungen aus dem Testbetrieb (Rückmeldung 30.08.2026)
  - Bilder im Abschnitt „Inhalt" sind in der Größe anpassbar: Ziehgriffe an der rechten Kante und der rechten unteren Ecke, dazu eine Auswahlleiste mit 25/50/75/100 % und Umfluss Block/Links/Rechts. Die Extension `extensions/ResizableImage.tsx` lag bisher nur im Glossar-Editor und wird jetzt von `BlockEditor` und `SimpleEditor` gemeinsam genutzt; Breite und Umfluss sitzen am Bildrahmen und werden im Inhalts-JSON mitgespeichert (keine Migration nötig)
  - SVG-Anzeige im Abschnitt „BPMN 2.0-Diagramm": Exporte ohne `viewBox` (typisch bei Miro und Visio) werden aus `width`/`height` ergänzt — vorher blieb die Grafik ausschnittsweise stehen und war nur über Zoom erreichbar. Die Rahmenhöhe ist per Ziehgriff verstellbar und wird je Abschnitt gespeichert (`svgHeight`), dazu Vollbild (Esc zum Verlassen) und eine eigene Leiste für Vergrößern/Verkleinern/Einpassen
  - Tabellen-Bearbeitungsleiste wandert beim Scrollen mit: Sie bleibt unterhalb der Formatleiste sichtbar, solange die Tabelle im Bild ist, und verschwindet mit ihr. Bei langen Tabellen entfällt damit das Hochscrollen zum Einfügen einer Zeile
  - Upload-Grenze von 50 MB auf 100 MB angehoben (z. B. für kurze Screencasts). Der Wert steht jetzt als einzige Quelle in `lib/shared/src/uploads` und gilt für Frontend-Prüfung, Server-Limit und alle Meldungstexte; `MAX_UPLOAD_MB` übersteuert ihn serverseitig weiterhin. Medienbibliothek und Quellverweis-Upload prüfen die Größe jetzt vor dem Senden (vorher gar nicht). SharePoint-Uploads laufen oberhalb von 4 MB über eine gestückelte Upload-Session, da Microsoft Graph den einfachen PUT dort nicht mehr vorsieht
  - Laufzeittest für den gestückelten SharePoint-Upload (`sharepoint-upload.test.ts`): prüft lückenlose Byte-Bereiche, unveränderten einfachen PUT für kleine Dateien, Abbruch samt Verwerfen der Sitzung bei einem fehlgeschlagenen Stück
  - **Betriebshinweis:** `client_max_body_size` in den nginx-Vhosts `flowcore-dev`/`flowcore-prod` muss auf mindestens `128m` stehen, sonst antwortet der Reverse-Proxy vor der Anwendung mit 413
- Cluster 33: Regression, Migration und formale Abnahme
  - Migrationsmatrix pro Seitentyp (docs/MIGRATION-MATRIX.md): Mapping bestehender Inhalte auf neue strukturierte Felder, Compound-Typ-Migrationsregeln (SIPOC, RACI, Q&A, Terme, Checkliste, Kompetenzen), Fallback-Regeln, Garantie gegen stille Datenverluste, 3-Phasen-Migrationsstrategie
  - Diff/Review-Kompatibilität für strukturierte Widgets: `detectCompoundType()` und `formatCompoundForDisplay()` in text-diff.ts für lesbare Darstellung von SIPOC-Tabellen, RACI-Matrizen, Q&A-Repeatern, Term-Repeatern, Check-Items und Kompetenz-Bereichen im Revisionsvergleich
  - Compound-Typ-Badge im RevisionDiffView: Blauer Badge zeigt Widget-Typ (z.B. "SIPOC-Tabelle", "RACI-Matrix") bei strukturierten Feldern im Diff an
  - Erweiterte Feldlabels in text-diff.ts: 30+ neue deutsche Übersetzungen für Abschnitts- und Feldnamen (governance, sipoc, process_steps, competencies, etc.)
  - RevisionDiffView: Abschnitt "Governance-Felder" umbenannt zu "Strukturierte Felder" für korrekte Darstellung aller Feldtypen
  - E2E-Abnahmeprotokoll (docs/E2E-ACCEPTANCE.md): 48 Prüfpunkte in 7 Bereichen (Seitenerstellung, Seitentypwechsel, strukturierte Felder, KI-Vorschläge, Übersichtsseiten, Publish-Readiness, Versionsvergleich)
  - Clusterreport (docs/reports/CLUSTER-33-REPORT.md) mit Dateiliste und Ergebnisnachweis

- Cluster 14: Source of Truth, GitHub-Sync und Release-Disziplin
  - Source-of-Truth-Modell dokumentiert (docs/15-SOURCE-OF-TRUTH.md): Führungsquelle je Artefakttyp (Code, DB-Schema, API-Spec, Config, Inhalte, Docs, Templates), Sync-Pfade, Widerspruchsrisiken
  - Konsistenzprüfung im Admin-Bereich (Einstellungen → Konsistenz): Prüft DB-Verbindung, Schema-Drift (erwartete vs. vorhandene Tabellen), DB-Erweiterungen, Konfiguration, Sicherheit, Dokumentation, Backup-Status, Release-Stand
  - Release-Verwaltung im Admin-Bereich (Einstellungen → Releases): Verbindlicher Release-Pfad (In Arbeit → Audit → GitHub-Sync → Release), CRUD für Release-Records, Statusübergänge mit Validierung, Timeline-Ansicht
  - Neue DB-Tabelle `releases` mit Status-Enum (in_progress, audit_pending, audit_passed, sync_pending, released, revoked)
  - 6 neue API-Endpunkte: GET/POST /admin/releases, GET/PATCH /admin/releases/:id, POST /admin/releases/:id/transition, GET /admin/consistency-check
  - Backend-Services: consistency.service.ts (automatische Systemprüfung), release.service.ts (Release-Lifecycle-Management)
  - Frontend-Komponenten: ConsistencyTab, ReleaseTab in Settings-Seite
  - Dokumentationsindex (docs/00-INDEX.md) aktualisiert

- Cluster 11: Prozessmanagement-Dashboard und Qualitätsanalytik
  - Quality metrics engine (`quality.service.ts`) with SQL-driven analytics: page counts by status, orphan detection, overdue review tracking, completeness scoring, duplicate title analysis, stale content identification, archived reference detection
  - 6 new API endpoints under `/api/quality/*`: overview, pages (filterable), duplicates, maintenance-hints, my-work (personal cockpit), search-insights
  - Process Management Dashboard page (`/dashboard`): 8 KPI stat cards, quality distribution bars, sortable page list with completeness indicators, maintenance hints table with severity badges, duplicate group viewer
  - Personal Work Cockpit page (`/my-work`): role-based work lists for drafts, pending reviews, pending approvals, and owned pages needing attention; grouped by category with priority badges
  - Sidebar navigation entries for Dashboard and Meine Aufgaben
  - Hub page Dashboard card now clickable (was placeholder)
  - Progress component extended with `indicatorClassName` prop for colored progress bars
  - OpenAPI spec: 6 quality endpoints + 7 schemas (QualityOverview, PageQualityRow, PageQualityList, DuplicateGroup, MaintenanceHint, PersonalWorkItem, SearchInsights)
  - All SQL queries use parameterized values (no sql.raw for user input)

- Nachschärfung Cluster 1-3: Comprehensive refinement
  - ADR-005: Eigenentwicklung auf Replit (architecture premise)
  - ADR-006: Campus-first / Multi-Org / Multi-Brand architecture
  - ADR-007: Provider Abstraction Strategy (6 provider categories)
  - Benchmark Feature Register (docs/03-BENCHMARK-FEATURE-REGISTER.md)
  - Provider TypeScript interfaces: IAuthProvider, IStorageProvider, ISearchProvider, IAIProvider, IConnectorProvider, INotificationProvider (lib/shared/src/providers/)
  - 14 new database tables: organization_units, brands, locations, business_functions, source_systems, storage_providers, source_references, content_node_context, page_watchers, page_comments, page_verifications, favorites, notifications, media_asset_usages
  - 5 new enums: notification_channel, notification_status, media_classification, comment_status, verification_status
  - Extended media_assets: classification, caption, source_url, source_library, source_path, video_metadata, transcript_ref, storage_provider_id
  - RBAC scope-aware role resolution (role_assignments.scope now evaluated against node hierarchy)
  - Expiration-aware role filtering (expired role assignments excluded)
  - Updated data model documentation with enterprise and collaboration entities

- Cluster 5: Page Types, Templates, and Creation Flow
  - Shared page type registry (`lib/shared/src/page-types/`) with all 10 types (process_overview, procedure, work_instruction, change_record, checklist, role_profile, policy, onboarding_plan, dashboard, system_steckbrief)
  - Each type: icon, color, category, allowedChildTypes, metadataFields with groups, sections
  - `calculateCompleteness()` helper for metadata completeness percentage
  - Backend GET /content/page-types and GET /content/page-types/:templateType endpoints
  - OpenAPI spec updated with PageTypeDefinition, MetadataFieldDef, PageTypeSection schemas
  - Multi-step CreateNodeDialog (type-selection cards → title/parent → summary/create)
  - PeoplePicker component with debounced Graph API search
  - MetadataFieldRenderer, MetadataPanel (grouped by identity/governance/validity/classification)
  - CompletenessIndicator (progress bar with tooltip breakdown)
  - Type-specific layouts: ProcessOverviewLayout (SIPOC/KPIs), ProcedureLayout, PolicyLayout, RoleProfileLayout, GenericSectionLayout
  - PageLayout dispatcher selecting layout by templateType
  - NodeDetail enhanced with tabs (Inhalt/Metadaten/Unterseiten), colored PageTypeIcon, completeness indicator
  - PageTypeIcon component mapping template types to Lucide icons with type colors

- Cluster 4: React+Vite frontend with navigation, Knowledge Hub shell
  - React 19 + Vite + TailwindCSS 4 + shadcn/ui frontend artifact (`wiki-frontend`)
  - App shell with collapsible sidebar, header with search bar, user info
  - Sidebar tree navigation with lazy-load children from API
  - Breadcrumb navigation using node ancestor chain
  - Knowledge Hub landing page with quick links and core process cards
  - Node detail page with metadata, children list, create/delete actions
  - Search page with real-time filtering
  - CreateNodeDialog with template type selection
  - Dev-mode auth header injection (`X-Dev-Principal-Id`)
  - API proxy from Vite dev server to Express backend
  - Backend: `GET /content/nodes/:id/ancestors` endpoint for breadcrumbs
  - OpenAPI spec updated with ancestors endpoint

- Cluster 1: Delivery foundation established
  - Architecture map and ADR-001 (Current State)
  - Agent Playbook with delivery checklists
  - Quality gates: typecheck, lint, test, e2e, no-hardcode-check, docs:check
  - Config validation with Zod schema (fail-fast, no silent defaults)
  - Enhanced health endpoint with database connectivity check
  - Audit events database table and service
  - Correlation ID middleware for request tracing
  - Playwright E2E test infrastructure
  - Documentation structure (ADRs, changelog, tech log)

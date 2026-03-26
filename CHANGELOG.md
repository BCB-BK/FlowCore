# Changelog

All notable changes to the Enterprise Wiki project.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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

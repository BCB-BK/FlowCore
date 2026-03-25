# Changelog

All notable changes to the Enterprise Wiki project.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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

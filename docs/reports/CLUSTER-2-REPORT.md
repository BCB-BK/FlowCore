# Cluster 2 – Fachliches Datenmodell und Content Graph – Umsetzungsbericht

**Date**: 2026-03-25
**Status**: Complete

## Scope vs. Result

| Task | Status | Notes |
|------|--------|-------|
| 1. Fachliches Kernmodell | Done | 9 tables + 6 enums |
| 2. DB Schema + Shared Contracts | Done | Drizzle tables, Zod types, pushed to DB |
| 3. Tree + Graph parallel | Done | parent_node_id hierarchy + content_relations with 8 types |
| 4. Immutable Identity + Numbering | Done | WN-XXXXXXXX IDs, auto display_code, aliases |
| 5. Versions-/Revisionslogik | Done | Immutable revisions, version labels, restore |
| 6. Versionsstamm-Ansicht | Done | getVersionTree query with all required fields |
| 7. Templates + Seitentypen | Done | 10 template types with structured field schemas |
| 8. Query-Layer + Seed + Tests | Done | 25 E2E tests, seed data with process example |
| 9. Cluster-2-Abschluss | Done | This report + ADRs + data model doc |

## Database Tables Created

| Table | Purpose |
|-------|---------|
| content_templates | 10 page type definitions with field schemas |
| content_nodes | Stable content objects with dual IDs |
| content_revisions | Immutable content snapshots |
| content_revision_events | Lifecycle events per revision |
| content_aliases | Display code history |
| content_relations | Typed graph edges with cycle detection |
| content_tags | Tag definitions |
| content_node_tags | Node↔Tag junction |
| media_assets | File attachments |

## Enums Created

| Enum | Values |
|------|--------|
| node_status | draft, in_review, approved, published, archived, deleted |
| change_type | editorial, minor, major, regulatory, structural |
| relation_type | related_to, uses_template, depends_on, implements_policy, upstream_of, downstream_of, replaces, references |
| template_type | 10 types (core_process_overview, area_overview, etc.) |
| revision_event_type | created, submitted_for_review, review_approved, review_rejected, published, archived, restored, superseded |

## Services Created

| Service | Key Functions |
|---------|---------------|
| identity.service.ts | createContentNode, moveNode, generateDisplayCode |
| revision.service.ts | createRevision, publishRevision, restoreRevision, getVersionTree |
| graph.service.ts | createRelation, detectCycle, getNodeRelations, getNodeChildren, getNodeTree |

## API Endpoints (17 total)

All under `/api/content/`. See docs/02-DATA-MODEL.md for full list.

## Test Results

25 E2E tests covering:
- Node CRUD with auto-ID generation
- Child node creation under parent
- Display code auto-derivation from template type
- Soft delete
- Revision creation with sequential numbering
- Version publishing with label assignment
- Revision restoration (creates new revision, never mutates)
- Version tree query
- Graph relation creation
- Self-reference prevention
- Cycle detection for directed relations (3-node cycle test)
- Relation deletion
- Template listing and field schema validation
- Node move with alias creation
- Tree traversal

## Quality Gate Results

- typecheck: PASS
- lint: PASS
- no-hardcode-check: PASS
- docs:check: PASS
- E2E (25 tests): PASS

## Seed Data

Created via `pnpm --filter @workspace/db run seed`:
- 10 content templates
- 1 root node: "Kernprozess: Lehre & Studium" (KP-001)
- 2 child nodes: "Studierendenverwaltung" (KP-001.PRZ-001), "Immatrikulationsverfahren" (KP-001.VA-001)
- 2 revisions on root (v1.0 published + draft rev 2)
- 1 depends_on relation between child nodes

## New Files

```
lib/db/src/schema/enums.ts
lib/db/src/schema/content-templates.ts
lib/db/src/schema/content-nodes.ts
lib/db/src/schema/content-revisions.ts
lib/db/src/schema/content-aliases.ts
lib/db/src/schema/content-relations.ts
lib/db/src/schema/content-tags.ts
lib/db/src/schema/media-assets.ts
lib/db/src/seed.ts
artifacts/api-server/src/services/identity.service.ts
artifacts/api-server/src/services/revision.service.ts
artifacts/api-server/src/services/graph.service.ts
artifacts/api-server/src/routes/content.ts
e2e/tests/content.spec.ts
docs/02-DATA-MODEL.md
docs/adr/ADR-002-dual-id-system.md
docs/adr/ADR-003-revision-version-model.md
docs/reports/CLUSTER-2-REPORT.md
docs/reports/CLUSTER-2-AUDIT.md
```

## Open Items for Cluster 3

1. Request validation middleware (Zod validation on POST bodies)
2. Pagination on list endpoints
3. Full-text search across content
4. File upload handling for media_assets
5. Review/approval workflow integration
6. Permission checks on content operations

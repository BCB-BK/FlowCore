# Data Model – Enterprise Wiki

## Overview

The data model implements a process-based knowledge management system with:
- Stable content objects (content_nodes) separated from content snapshots (content_revisions)
- Dual ID system: immutable system ID + mutable display code
- Tree hierarchy (parent/child) + graph relations (typed edges)
- Template-driven structured fields per page type
- Full revision/version lifecycle

## Entity Relationship

```
organization_units ──┐
brands ──────────────┤ Enterprise Context
locations ───────────┤
business_functions ──┘

content_templates (10 types)
       │
       ▼
content_nodes ──────────────► content_aliases (display_code history)
  │  │  │  │
  │  │  │  └──► content_node_tags ◄──── content_tags
  │  │  │
  │  │  └──► content_revisions ──► content_revision_events
  │  │
  │  └──► content_relations (graph edges, source ↔ target)
  │  │
  │  └──► media_assets ──► media_asset_usages
  │  │
  │  └──► source_references ──► source_systems
  │
  └──► page_watchers ──┐
  └──► page_comments ──┤ Collaboration
  └──► page_verifications
  └──► favorites
  └──► notifications

storage_providers (configurable backends for media_assets)
```

## Enterprise / Multi-Org Entities

### organization_units
Organizational units within the campus (departments, divisions). Self-referencing hierarchy via `parent_id`.

### brands
Schools / brands under the campus umbrella. Each with name, slug, logo, primary color.

### locations
Physical locations (buildings, campus sections, rooms).

### business_functions
Cross-cutting functions (Quality Management, IT, HR, Finance).

### source_systems
External systems connected to the wiki (SharePoint, ERP, HR systems). Connection config stored as JSONB.

### storage_providers
Configurable media storage backends (local filesystem, Azure Blob, SharePoint). One marked as default.

### source_references
Links content nodes to records in external source systems. Tracks sync status.

## Collaboration & Social Entities

### page_watchers
Per-principal watch subscriptions on content nodes. Optional `watch_children` for recursive notifications.

### page_comments
Threaded comments on content nodes. Supports inline annotations via `anchor_selector`. Status: active / resolved / deleted.

### page_verifications
Periodic content verification records. Tracks who verified, when next verification is due.

### favorites
User bookmarks / favorites for quick access to content nodes. Sorted by `sort_order`.

### notifications
In-app, email, or Teams notifications. Linked to recipient, optional actor and node. Status: unread / read / dismissed.

### media_asset_usages
Tracks which content nodes reference which media assets. Enables cross-page usage reporting.

## Core Entities

### content_templates
Template definitions for 10 page types, each with a structured `field_schema` (JSONB) defining required sections and fields.

| Template Type | German Name | Key Fields |
|---|---|---|
| core_process_overview | Kernprozess-Übersicht | SIPOC, KPIs, Compliance |
| area_overview | Bereichsübersicht | Description |
| process_page_text | Prozessseite (Text) | Steps, RACI, Interfaces |
| process_page_graphic | Prozessseite (Grafik) | Swimlane data |
| procedure_instruction | Verfahrensanweisung | Purpose, Steps, Responsibilities |
| use_case | Use Case | Actor, Flows, Conditions |
| policy | Richtlinie | Purpose, Scope, Policy text |
| role_profile | Rollenprofil | Responsibilities, Qualifications |
| dashboard | Dashboard | Widgets configuration |
| system_documentation | Systemdokumentation | Interfaces, Data objects |

### content_nodes
Stable content object — the "identity" of a wiki page. Never mutated for content changes.

- `id` (UUID): Primary key
- `immutable_id` (text): System-generated, never changes (format: `WN-XXXXXXXX`)
- `display_code` (text): Human-readable hierarchical code (e.g., `KP-001.PRZ-002`)
- `title` (text): Current title
- `template_type` (enum): Page type
- `parent_node_id` (UUID, nullable): Tree hierarchy parent
- `status` (enum): draft → in_review → approved → published → archived → deleted
- `current_revision_id` (UUID): Latest revision
- `published_revision_id` (UUID): Currently published version

### content_revisions
Immutable snapshot of content at a point in time. Never mutated after creation.

- `revision_no` (int): Sequential per node (1, 2, 3...)
- `version_label` (text, nullable): Only set for published versions (1.0, 1.1, 2.0)
- `change_type` (enum): editorial, minor, major, regulatory, structural
- `content` (JSONB): Rich text / structured content
- `structured_fields` (JSONB): Template-specific field values
- `based_on_revision_id` (UUID): For traceability (which revision this was based on)
- `change_summary` (text): What changed
- `changed_fields` (JSONB): List of field keys that changed

### content_aliases
History of display_code changes when nodes are restructured.

### content_relations
Typed graph edges between content nodes with cycle detection for directed types.

Relation types: `related_to`, `uses_template`, `depends_on`, `implements_policy`, `upstream_of`, `downstream_of`, `replaces`, `references`

### content_tags / content_node_tags
Tagging system with slugs and colors.

### media_assets
File attachments linked to content nodes. Extended fields:
- `classification` (enum): document, image, video, audio, spreadsheet, presentation, template, form, archive, other
- `caption` / `alt_text`: Accessibility and descriptive metadata
- `source_url` / `source_library` / `source_path`: External source tracking
- `video_metadata` (JSONB): Duration, resolution, codec, etc.
- `transcript_ref`: Reference to transcript file or URL
- `storage_provider_id`: Which storage provider hosts this asset

## Dual ID System

1. **immutable_id** (`WN-XXXXXXXX`): Never changes. Used for internal references, audit trails, and API stability.
2. **display_code** (e.g., `KP-001.PRZ-002`): Reflects current position in hierarchy. Changes on restructuring. Old codes stored in `content_aliases`.

## Revision vs. Version

- **Revision**: Every save creates a new revision. Sequential numbering per node. Immutable after creation.
- **Version**: A published revision gets a version label (1.0, 1.1, 2.0). Only one version can be "published" at a time.
- **Restore**: Creates a new revision with content copied from an older revision. Never mutates historical snapshots.

## State Machine

```
draft → in_review → approved → published → archived
  ↑         │                                 │
  └─────────┘ (rejected)                      │
  ↑                                           │
  └───────────────────────────────────────────┘ (restore)
```

## API Endpoints

All under `/api/content/`:

| Method | Path | Description |
|---|---|---|
| GET | /nodes | List all active nodes |
| GET | /nodes/roots | List root nodes (no parent) |
| GET | /nodes/:id | Get single node |
| POST | /nodes | Create node (auto-generates IDs) |
| DELETE | /nodes/:id | Soft-delete node |
| POST | /nodes/:id/move | Move node to new parent |
| GET | /nodes/:id/children | Get child nodes |
| GET | /nodes/:id/tree | Recursive tree traversal |
| GET | /nodes/:id/aliases | Display code history |
| POST | /nodes/:id/revisions | Create revision |
| GET | /nodes/:id/revisions | Version tree |
| POST | /revisions/:id/publish | Publish with version label |
| POST | /revisions/:id/restore | Restore old revision |
| POST | /relations | Create graph relation |
| GET | /nodes/:id/relations | Get node relations |
| DELETE | /relations/:id | Remove relation |
| GET | /templates | List active templates |

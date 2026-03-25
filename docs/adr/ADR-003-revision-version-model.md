# ADR-003: Revision and Version Model

**Status**: Accepted
**Date**: 2026-03-25

## Context

The wiki needs full traceability of content changes with formal version approval for regulatory compliance.

## Decision

Separate revision (every change) from version (approved milestone):

- **content_revision**: Immutable snapshot created on every save. Sequential `revision_no` per node. Contains full content snapshot.
- **version_label**: Only assigned when a revision is published (e.g., "1.0", "2.0"). Represents formally approved state.
- **Restore**: Always creates a new revision with content copied from the source. Never mutates historical records.
- **change_type**: Classifies changes as editorial, minor, major, regulatory, or structural.

## Consequences

- Full audit trail with no data mutation
- Clear distinction between "work in progress" and "approved" content
- Regulatory-compliant version history
- Restore operations are traceable (based_on_revision_id)
- Version tree queries are straightforward (ordered by revision_no)

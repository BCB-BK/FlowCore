# ADR-002: Dual ID System (Immutable ID + Display Code)

**Status**: Accepted
**Date**: 2026-03-25

## Context

Wiki pages need stable identity for API references, audit trails, and cross-references, but also human-readable hierarchical codes that reflect organizational structure.

## Decision

Implement a dual ID system:
1. **immutable_id** (format: `WN-XXXXXXXX`): Server-generated, never changes, never reused. Used for all internal references.
2. **display_code** (format: `KP-001.PRZ-002`): Derived from template type prefix and position in hierarchy. Changes when nodes are restructured.

When a display_code changes, the old code is stored in `content_aliases` for redirect/lookup purposes.

## Consequences

- Stable API contracts regardless of organizational restructuring
- Users see meaningful hierarchical codes
- Old URLs/references can be resolved via alias lookup
- Display code generation requires template type prefix mapping

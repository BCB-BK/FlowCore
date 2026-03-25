# ADR-001: Current State Assessment

**Status**: Accepted
**Date**: 2026-03-25
**Context**: Cluster 1 – Delivery Foundation

## Context

The project starts as a clean pnpm monorepo with Express 5, PostgreSQL/Drizzle, and OpenAPI codegen infrastructure. Before building wiki features, we assess what exists and what needs to be added.

## Decision

We will build the Enterprise Wiki on top of the existing monorepo infrastructure rather than starting fresh. The existing stack (Express 5, Drizzle ORM, OpenAPI codegen, pino logging) provides a solid foundation.

## Existing Assets to Reuse

1. **Express 5 API server** with pinoHttp structured logging
2. **Drizzle ORM** with PostgreSQL connection pooling
3. **OpenAPI → Orval codegen** pipeline for type-safe clients
4. **pino** with redaction for sensitive headers
5. **esbuild** production bundling with pino plugin
6. **pnpm workspace** with catalog version pinning

## Gaps to Address (Cluster 1)

1. Config validation (Zod schema for all env vars)
2. Audit event persistence (DB table + service)
3. Quality gates (lint, typecheck, tests, no-hardcode-check)
4. E2E testing infrastructure (Playwright)
5. Documentation structure (ADRs, changelog, tech log)
6. Delivery workflow and agent playbook

## Consequences

- All wiki features build on this existing infrastructure
- No framework migration or replacement needed
- Focus on extending, not replacing

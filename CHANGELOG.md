# Changelog

All notable changes to the Enterprise Wiki project.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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

# Changelog

All notable changes to the Enterprise Wiki project.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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

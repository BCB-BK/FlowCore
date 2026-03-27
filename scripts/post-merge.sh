#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
npx tsx lib/db/src/seed-ai-field-profiles.ts

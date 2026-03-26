-- Migration: Add working copy tables and enums
-- Created for Task #28: Arbeitskopie-System Foundation

DO $$ BEGIN
  CREATE TYPE working_copy_status AS ENUM (
    'draft', 'submitted', 'in_review', 'changes_requested',
    'approved_for_publish', 'cancelled', 'published'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE working_copy_event_type AS ENUM (
    'created', 'updated', 'submitted', 'returned_for_changes',
    'approved', 'published', 'cancelled', 'unlocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS content_working_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES content_nodes(id),
  base_revision_id UUID REFERENCES content_revisions(id),
  status working_copy_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  content JSONB,
  structured_fields JSONB,
  editor_snapshot JSONB,
  change_type change_type NOT NULL DEFAULT 'editorial',
  change_summary TEXT,
  author_id TEXT NOT NULL,
  locked_by TEXT,
  last_ai_summary TEXT,
  last_manual_summary TEXT,
  reviewer_id TEXT,
  approver_id TEXT,
  diff_cache JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS working_copy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_copy_id UUID NOT NULL REFERENCES content_working_copies(id),
  event_type working_copy_event_type NOT NULL,
  actor_id TEXT,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_working_copies_node_id ON content_working_copies(node_id);
CREATE INDEX IF NOT EXISTS idx_working_copies_author_id ON content_working_copies(author_id);
CREATE INDEX IF NOT EXISTS idx_working_copies_status ON content_working_copies(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_working_copies_active_per_node
  ON content_working_copies(node_id)
  WHERE status NOT IN ('cancelled', 'published');

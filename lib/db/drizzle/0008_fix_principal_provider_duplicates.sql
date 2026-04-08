-- Migration: Fix principal provider duplicates
-- Consolidates principals with external_provider='entra_id' into their 'entra' counterparts,
-- or renames standalone 'entra_id' entries to 'entra'. Handles all duplicate patterns
-- safely without violating the unique index (external_provider, external_id).
-- Changes the DB default for external_provider from 'entra_id' to 'entra'.

DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
  remove_id uuid;
BEGIN

  -- -----------------------------------------------------------------------
  -- PASS 1: For each 'entra_id' principal that has a matching 'entra' entry
  --         (same external_id), merge all references onto the 'entra' keeper
  --         and hard-delete the 'entra_id' duplicate row.
  -- -----------------------------------------------------------------------
  FOR dup IN
    SELECT
      p_old.id   AS old_id,
      p_new.id   AS new_id,
      p_old.external_id AS ext_id
    FROM principals p_old
    JOIN principals p_new
      ON  p_new.external_id       = p_old.external_id
      AND p_new.external_provider = 'entra'
      AND p_new.id                <> p_old.id
    WHERE p_old.external_provider = 'entra_id'
    ORDER BY p_old.created_at ASC
  LOOP
    keep_id   := dup.new_id;
    remove_id := dup.old_id;

    -- Migrate role_assignments that don't already exist on the keeper
    UPDATE role_assignments ra
    SET principal_id = keep_id
    WHERE ra.principal_id = remove_id
      AND NOT EXISTS (
        SELECT 1 FROM role_assignments ra2
        WHERE ra2.principal_id = keep_id
          AND ra2.role          = ra.role
          AND ra2.scope         = ra.scope
          AND ra2.is_active     = true
      );
    -- Delete leftover role_assignments on the duplicate
    DELETE FROM role_assignments WHERE principal_id = remove_id;

    -- Migrate page_permissions (avoid duplicates)
    UPDATE page_permissions pp
    SET principal_id = keep_id
    WHERE pp.principal_id = remove_id
      AND NOT EXISTS (
        SELECT 1 FROM page_permissions pp2
        WHERE pp2.principal_id = keep_id
          AND pp2.node_id      = pp.node_id
          AND pp2.permission   = pp.permission
      );
    DELETE FROM page_permissions WHERE principal_id = remove_id;

    -- Migrate node_ownership references
    UPDATE node_ownership SET owner_id    = keep_id WHERE owner_id    = remove_id;
    UPDATE node_ownership SET deputy_id   = keep_id WHERE deputy_id   = remove_id;
    UPDATE node_ownership SET reviewer_id = keep_id WHERE reviewer_id = remove_id;
    UPDATE node_ownership SET approver_id = keep_id WHERE approver_id = remove_id;

    -- Migrate deputy_delegations references
    UPDATE deputy_delegations SET principal_id = keep_id WHERE principal_id = remove_id;
    UPDATE deputy_delegations SET deputy_id    = keep_id WHERE deputy_id    = remove_id;

    -- Hard-delete the duplicate principal row to avoid unique index violation
    DELETE FROM principals WHERE id = remove_id;

    RAISE NOTICE 'PASS1: Merged and deleted principal % (entra_id) into % (entra) for external_id=%',
      remove_id, keep_id, dup.ext_id;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- PASS 2: Rename any remaining 'entra_id' principals (no 'entra' counterpart)
  --         to 'entra'. Process one at a time in creation order to avoid
  --         any transient unique-index conflicts.
  -- -----------------------------------------------------------------------
  FOR dup IN
    SELECT id, external_id
    FROM principals
    WHERE external_provider = 'entra_id'
    ORDER BY created_at ASC
  LOOP
    -- Check if an 'entra' entry now exists (could have been created in PASS1
    -- or by a previous PASS2 iteration renaming a same-external_id peer)
    SELECT id INTO keep_id
    FROM principals
    WHERE external_id       = dup.external_id
      AND external_provider = 'entra'
      AND id                <> dup.id
    LIMIT 1;

    IF keep_id IS NULL THEN
      -- Safe to rename: no 'entra' counterpart exists
      UPDATE principals
      SET external_provider = 'entra', updated_at = NOW()
      WHERE id = dup.id;

      RAISE NOTICE 'PASS2: Renamed principal % from entra_id to entra (external_id=%)',
        dup.id, dup.external_id;
    ELSE
      -- A counterpart exists — merge into it and delete this duplicate.
      remove_id := dup.id;

      UPDATE role_assignments ra
      SET principal_id = keep_id
      WHERE ra.principal_id = remove_id
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.principal_id = keep_id
            AND ra2.role         = ra.role
            AND ra2.scope        = ra.scope
            AND ra2.is_active    = true
        );
      DELETE FROM role_assignments WHERE principal_id = remove_id;

      UPDATE page_permissions pp
      SET principal_id = keep_id
      WHERE pp.principal_id = remove_id
        AND NOT EXISTS (
          SELECT 1 FROM page_permissions pp2
          WHERE pp2.principal_id = keep_id
            AND pp2.node_id      = pp.node_id
            AND pp2.permission   = pp.permission
        );
      DELETE FROM page_permissions WHERE principal_id = remove_id;

      UPDATE node_ownership SET owner_id    = keep_id WHERE owner_id    = remove_id;
      UPDATE node_ownership SET deputy_id   = keep_id WHERE deputy_id   = remove_id;
      UPDATE node_ownership SET reviewer_id = keep_id WHERE reviewer_id = remove_id;
      UPDATE node_ownership SET approver_id = keep_id WHERE approver_id = remove_id;
      UPDATE deputy_delegations SET principal_id = keep_id WHERE principal_id = remove_id;
      UPDATE deputy_delegations SET deputy_id    = keep_id WHERE deputy_id    = remove_id;

      DELETE FROM principals WHERE id = remove_id;

      RAISE NOTICE 'PASS2 (conflict): Merged and deleted principal % (entra_id) into % (entra) for external_id=%',
        remove_id, keep_id, dup.external_id;
    END IF;
  END LOOP;

END;
$$;

-- Change the DB-level column default for future inserts
ALTER TABLE principals ALTER COLUMN external_provider SET DEFAULT 'entra';

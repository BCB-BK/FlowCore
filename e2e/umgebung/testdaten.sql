-- Testdatenbestand fuer die E2E-Laeufe.
--
-- Die Testdateien setzen feste Kennungen voraus (siehe die Konstanten
-- ADMIN_ID/EDITOR_ID/VIEWER_ID/REVIEWER_ID/PM_ID in den *.spec.ts). Der
-- allgemeine Seed in lib/db legt Vorlagen und Seiten an, aber keine Personen --
-- ohne diese Datei antwortet jeder Aufruf mit "Principal not found" (401).
--
-- 00000000-...-0000 und -0099 werden bewusst NICHT angelegt: die Tests
-- benutzen sie als absichtlich unbekannte Kennungen fuer die Fehlerfaelle.
INSERT INTO principals (id, principal_type, external_provider, external_id, display_name, email, status) VALUES
  ('00000000-0000-0000-0000-000000000001','user','e2e','e2e-admin','Dev Admin','admin@example.invalid','active'),
  ('00000000-0000-0000-0000-000000000002','user','e2e','e2e-editor','Dev Editor','editor@example.invalid','active'),
  ('00000000-0000-0000-0000-000000000003','user','e2e','e2e-viewer','Dev Viewer','viewer@example.invalid','active'),
  ('00000000-0000-0000-0000-000000000004','user','e2e','e2e-reviewer','Dev Reviewer','reviewer@example.invalid','active'),
  ('00000000-0000-0000-0000-000000000005','user','e2e','e2e-pm','Dev Process Manager','pm@example.invalid','active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_assignments (principal_id, role, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001','system_admin',true),
  ('00000000-0000-0000-0000-000000000002','editor',true),
  ('00000000-0000-0000-0000-000000000003','viewer',true),
  ('00000000-0000-0000-0000-000000000004','reviewer',true),
  ('00000000-0000-0000-0000-000000000005','process_manager',true)
ON CONFLICT DO NOTHING;

# FlowCore – Technische Bestandsaufnahme (Code-Audit)

**Stand:** 22.07.2026
**Umfang:** Gesamtes Repository (`artifacts/api-server`, `artifacts/wiki-frontend`, `lib/*`, `scripts/`, Konfiguration), Schwerpunkte: Fehler im Code, unerwünschtes Hardcoding, Sicherheits- und Architekturmängel.
**Methode:** Statische Analyse des vollständigen Quellcodes in drei parallelen Prüfsträngen (Konfiguration/Hardcoding, Backend/Sicherheit, Frontend/Qualität), abgeglichen mit `.env.example`, Dokumentation und Git-Historie.

Die mit ✅ markierten Punkte wurden im Branch `claude/flowcore-audit-feedback-xanbfa` bereits behoben.

---

## 1. Kritische Funde

### K1 – Vertikale Rechteausweitung über die Rollenvergabe
**Ort:** `artifacts/api-server/src/routes/principals.ts` (`POST /principals/:id/roles`) + `services/principal.service.ts` (`assignRole`)

Die Rollenzuweisung ist nur mit `requirePermission("manage_permissions")` geschützt und akzeptiert **jede** Rolle ungeprüft — auch `system_admin`. Die Rolle `process_manager` besitzt selbst `manage_permissions` und kann sich damit selbst (oder jedem anderen Principal) `system_admin` zuweisen. Es fehlt eine Prüfung, dass der Vergebende die zu vergebende Rolle überragt, sowie ein Selbst-Eskalations-Schutz. Damit ist die gesamte RBAC-Trennung aushebelbar.

**Empfehlung:** Vergabe von `system_admin` (und ggf. `process_manager`) nur durch `system_admin` zulassen; Selbst-Zuweisung höherer Rollen blockieren; Audit-Event bleibt bestehen.

### K2 – `GET /content/nodes` liefert alle Knoten ohne Vertraulichkeitsfilter
**Ort:** `artifacts/api-server/src/routes/content.ts` (`GET /nodes`)

Anders als `/nodes/roots`, `/nodes/:id/children`, `/siblings` und `/backlinks` (die `checkConfidentialityAccessBatch` anwenden) filtert dieser Endpunkt nichts. Jeder authentifizierte Nutzer mit globalem `read_page` (bereits die `viewer`-Rolle) erhält Titel, Display-Codes, Owner und Status **aller** Knoten — inklusive `confidential` und `strictly_confidential`. Metadaten-Leak vertraulicher Seiten.

**Empfehlung:** Denselben Batch-Vertraulichkeitsfilter wie in den übrigen Listen-Endpunkten anwenden.

### K3 – Echte Entra-Identifier und Produktions-Redirect-URI im Repository
**Ort:** `.replit` (Abschnitt `[userenv.shared]`)

`ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID` und die Produktions-Callback-URL sind fest eingecheckt. Damit ist das Repo an genau einen Azure-Mandanten gekoppelt, die IDs werden offengelegt, und der saubere Weg über `process.env` (in `config.ts` korrekt umgesetzt) wird unterlaufen.

**Empfehlung:** Werte in Replit-Secrets/Deployment-Umgebung verlagern und aus `.replit` entfernen.

### K4 – `AUTH_DEV_MODE` ist aktiv, sobald `NODE_ENV` nicht exakt `production` ist
**Ort:** `artifacts/api-server/src/lib/config.ts`, `middlewares/require-auth.ts`, `app.ts`

Im Dev-Modus genügt der HTTP-Header `X-Dev-Principal-Id`, um sich als **beliebiger** Principal auszugeben — ohne SSO. Die Absicherung greift nur bei `NODE_ENV === "production"`. Ist `NODE_ENV` in einer realen Umgebung nicht gesetzt oder z. B. `staging`, ist der vollständige Auth-Bypass live. Der Prod-Guard in `config.ts` existiert, aber die Default-Logik ist eine klassische Fehlkonfigurations-Falle (fail-open).

**Empfehlung:** Dev-Bypass nur bei explizit gesetztem `AUTH_DEV_MODE=true` UND `NODE_ENV=development` aktivieren (fail-closed).

### K5 – ✅ Stored-XSS in der Glossar-Ansicht (behoben)
**Ort:** `artifacts/wiki-frontend/src/pages/GlossaryPage.tsx`

`t.definition` wurde ungefiltert per `dangerouslySetInnerHTML` gerendert. Jeder mit Schreibrecht auf Glossareinträge konnte Script-Payloads hinterlegen, die bei allen Lesern ausgeführt werden. Es war die einzige ungefilterte `dangerouslySetInnerHTML`-Stelle (Suche und BPMN sanitisieren korrekt).

**Fix:** Neuer Allowlist-Sanitizer `src/lib/sanitize-html.ts` (erlaubt nur einfache Formatierungs-Tags, `href` nur http/https/mailto/relativ); Rendering läuft jetzt über `sanitizeHtml()`.

---

## 2. Hohe Schwere

### H1 – Medien-Download umgeht die Vertraulichkeitsprüfung
**Ort:** `artifacts/api-server/src/routes/media.ts` (`GET /media/files/:key`, `GET /media/assets`, `GET /media/assets/:id`)

Beim Datei-Download wird nur `read_page` geprüft, nicht `checkConfidentialityAccess` — Medien vertraulicher Seiten sind für Nutzer ohne Vertraulichkeitsfreigabe abrufbar. Assets ohne `nodeId` (z. B. SharePoint-Import) sind für **jeden** Authentifizierten abrufbar. Die Asset-Listen-Endpunkte geben Metadaten und URLs aller Assets ohne Berechtigungsprüfung heraus.

### H2 – Fail-open bei Entra-Gruppenprüfung und Rate-Limiter
**Ort:** `middlewares/require-auth.ts`, `middlewares/rate-limit.ts`

Schlägt der Graph-Aufruf zur Gruppenmitgliedschaft fehl (z. B. Graph nicht erreichbar, Throttling 429), wird der Request **durchgelassen** — ein deprovisionierter Nutzer behält Zugriff. Der Rate-Limiter lässt bei DB-Fehlern ebenfalls alles durch. Beides sollte fail-closed (oder mit kurzem Cache des letzten bekannten Zustands) arbeiten.

### H3 – Hardcodierte Produktions-Domain in Laufzeit-Services
**Ort:** `app.ts` (CORS-Allowlist), `glossary-projection.service.ts`, `copilot-content-projection.service.ts`

`https://flowcore.bildungscampus-backnang.de` ist mehrfach fest verdrahtet (CORS, Quell-URLs für Microsoft Search/Copilot-Zitate). `APP_PUBLIC_URL` existiert bereits in `.env.example` und sollte durchgängig genutzt werden. Domain-Wechsel erfordert derzeit Code-Änderungen; falsche Origin bricht CORS bzw. erzeugt tote Citation-Links.

### H4 – `.gitignore` ignoriert keine `.env`-Dateien
Es gibt keinen Eintrag für `.env`/`.env.local`. Ein lokal angelegtes `.env` mit echten Secrets (`SESSION_SECRET`, `ENTRA_CLIENT_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`) kann versehentlich committet werden — im Widerspruch zur eigenen Doku (`docs/05-CONFIG-ENV.md`).

### H5 – Benutzte, aber undokumentierte Umgebungsvariablen
- `GRAPH_EXTERNAL_CONNECTION_ID/_NAME/_DESCRIPTION` (`graph-connector-config.service.ts`) — weder in `.env.example` noch in `docs/05-CONFIG-ENV.md`
- `VITE_TEAMS_APP_ID` (`wiki-frontend/src/lib/teams.ts`) — nirgends dokumentiert
- `PORT` wird vom Server zwingend benötigt (`config.ts`, Zod ohne Default), `.env.example` dokumentiert stattdessen `API_PORT`

### H6 – ✅ Autosave-Timer des Working-Copy-Editors ohne Unmount-Cleanup *(teilweise offen)*
**Ort:** `pages/WorkingCopyEditorPage.tsx`

Der Autosave-`setTimeout` wird beim Verlassen der Editor-Seite nicht gecleart; nach dem Unmount feuert `doSave` → State-Update auf unmounteter Komponente + Save-Request nach Verlassen. Zusätzlich verwirft der `nodeId`-Wechsel-Effekt ausstehende Änderungen ohne Flush. **Noch offen** — empfohlener Fix: Cleanup-Funktion (`return () => clearTimeout(...)`) plus Flush vor dem Verwerfen.

### H7 – ✅ Slash-Menü kapert Tastatur im unsichtbaren Zustand (behoben)
**Ort:** `components/editor/SlashCommandMenu.tsx`

Der globale `keydown`-Listener fing `Enter`/Pfeiltasten auch dann ab, wenn das Menü wegen `filtered.length === 0` gar nicht gerendert wurde (inkl. `setSelectedIndex(NaN)` durch Modulo 0). **Fix:** Guard `if (!isOpen || filtered.length === 0) return;`.

---

## 3. Mittlere Schwere

### M1 – Vertraulichkeits-Defaults nach den letzten Commits sehr breit
Kombination der Commits `598ce19` (fehlende Klassifikation ⇒ `internal`) und `39843d8` (`internal` ⇒ ohne Grant für alle lesbar): Seiten ohne explizite Klassifikation (laut Projekthistorie ~1/3 des Bestands) sind jetzt pauschal für alle Angestellten sichtbar. Für sich genommen eine Produktentscheidung — in Verbindung mit K2/H1 aber eine breite, teils unbeabsichtigte Offenlegung. Bewusst entscheiden und dokumentieren.

### M2 – Doppel-Publish möglich (Race Condition)
**Ort:** `services/working-copy.service.ts` (`publishWorkingCopy`, analog `approveWorkingCopy`)

Statusprüfung (`approved_for_publish`) erfolgt **vor** der Transaktion; innerhalb der Transaktion (nach `pg_advisory_xact_lock`) wird der Status nicht erneut geprüft und das abschließende `UPDATE` hat keinen Status-Guard in der WHERE-Klausel. Zwei parallele Publish-Requests erzeugen zwei Revisionen und publizieren doppelt. Fix: Statusprüfung in die Transaktion ziehen bzw. `WHERE status = 'approved_for_publish'` mit Rowcount-Check.

### M3 – KI-Endpunkte ohne Permission-Gate/eigenes Rate-Limit; RAG umgeht Vertraulichkeit
**Ort:** `routes/ai.ts`, `services/ai.service.ts`

`/ai/ask`, `/ai/page-assist`, `/ai/field-assist` sind nur mit `requireAuth` geschützt — jeder `viewer` kann unbegrenzt teure LLM-Streaming-Aufrufe auslösen. Der RAG-Retriever filtert nur über `read_page`, nicht über `checkConfidentialityAccess` — Inhalte vertraulicher Seiten können in KI-Antworten von Nutzern ohne Freigabe landen.

### M4 – `POST /media/assets/:id/usages` ohne Berechtigung/Validierung
Nur `requireAuth`; `assetId`, `nodeId`, `revisionId`, `usageContext` werden ungeprüft eingefügt (Datenintegrität, IDOR, Enumeration).

### M5 – Löschanfragen: Informationsleck und inkonsistente Autorisierung
**Ort:** `routes/deletion-requests.ts`

`GET /deletion-requests` (Liste + Detail) ist für jeden Authentifizierten offen (alle Anfragen inkl. Titel und Antragsteller sichtbar). `POST` erlaubt Anfragen für beliebige `nodeId` ohne `read_page`-Prüfung (Existenz-Enumeration über 404/201). Der Review-Endpunkt prüft `archive_page` nur **global**, nicht knoten-skopiert — inkonsistent zu `DELETE /nodes/:id`.

### M6 – Login-CSRF: OAuth-State nicht sessiongebunden; keine Session-Regeneration
**Ort:** `routes/auth.ts`

Der `state` ist HMAC-signiert, aber stateless — nicht an die Browser-Session gebunden (`req.session.oauthState` deklariert, nie genutzt). Ein Angreifer kann das Opfer in den eigenen Account einloggen lassen (Login-CSRF). Nach erfolgreichem Login fehlt `req.session.regenerate` (Session-Fixation-Best-Practice).

### M7 – Copilot-Connector-Suche: Full-Scan + N+1 pro Anfrage
**Ort:** `services/copilot-connector-search.service.ts`

Jede `POST /copilot/search`-Anfrage lädt alle publizierten Knoten und projiziert jeden einzeln (mehrere DB-Roundtrips pro Knoten; Code-Kommentar nennt ~45 s in Produktion). Skalierungs-/DoS-Risiko bei geleaktem Connector-Key.

### M8 – `upsertPrincipal`: Grant-Merge außerhalb der Transaktion
**Ort:** `services/principal.service.ts`

Beim Zusammenführen von Duplikaten nutzt die Grant-Migration hart das globale `db` statt `txOrDb` — bei Rollback der äußeren Transaktion bleiben zusammengeführte Vertraulichkeitsfreigaben bestehen (inkonsistenter Zugriffszustand).

### M9 – Port-Konfiguration widersprüchlich
Server liest `PORT` (Pflicht), `.env.example` dokumentiert `API_PORT=3001`, Vite-Dev-Proxy defaultet auf `8080`. Setzen von `API_PORT` beeinflusst den Server nicht.

### M10 – Kundenspezifische Werte als Code-Defaults
- Default-UPN `flowcore@bildungscampus-backnang.de` in `routes/workflows-admin.ts` und `SettingsPage.tsx`
- Personenname „Tobias Wenninger" als `created_by` in `seed-data/workflow-templates.json`
- SharePoint-Hostname in `scripts/src/export-sharepoint-pages.ts`, System-Owner-UUID in `scripts/src/import-kernprozesse.ts` (beide durch die `no-hardcode-check`-Allowlist kaschiert)

### M11 – KI-Modellnamen mehrfach hart kodiert
`gpt-5.2` als Default in `ai.service.ts`, DB-Schema und `AISettingsPage.tsx`; Bild-/Audio-Clients (`lib/integrations-openai-ai-server`) mit gar nicht konfigurierbaren Modellen (`gpt-image-1`, `gpt-audio`, `gpt-4o-mini-transcribe`).

### M12 – Editor-Robustheit (Frontend)
- **Stale-Closure in `BlockEditor.onUpdate`:** Auto-Close des Slash-Menüs liest immer den veralteten `isOpen`-Wert — Menü schließt nicht zuverlässig. Fix: funktionales Update.
- **`JSON.stringify` des Gesamtdokuments bei jedem Tastendruck** (Slash-Erkennung) — Tipp-Latenz auf langen Seiten.
- **Controlled-Content-Effekt** kann bei asynchronem Autosave-Reload den Cursor zurücksetzen.

### M13 – Fünf parallele SharePoint-Browser-Implementierungen
`content/SharePointBrowser.tsx`, `settings/SharePointBrowser.tsx`, `editor/SharePointMediaBrowser.tsx`, `compound/SharePointFilePicker.tsx`, `settings/SharePointSiteDrivePicker.tsx` — duplizierte Icon-/Breadcrumb-/Size-Logik, bereits divergierende Mappings. Konsolidierung empfohlen.

### M14 – Index als React-Key in umsortierbaren Editor-Listen
`AgendaEditor`, `ReferencesEditor`, `QaRepeater`, `CompetencyAreas`, `ParticipantsEditor`, `TermRepeater`, `RaciMatrix` — bei Verschieben/Löschen ordnet React DOM-State der falschen Zeile zu. Stabile IDs pro Item verwenden.

### M15 – Magische Zahlen nicht konfigurierbar
Rate-Limits (30/15 min auth, 200/min API), Session-`maxAge` 8 h, Gruppen-Check-TTL 15 min, `express.json`-Limit 2 MB — für Betrieb/Härtung per Env konfigurierbar machen.

---

## 4. Niedrige Schwere / Hinweise

- **`moveNode`** prüft `edit_structure` nur am Quell-, nicht am Zielknoten.
- **Roh-Fehlermeldungen in 500-Antworten** in `admin.ts`/`media.ts` (zentraler Error-Handler wird umgangen).
- **`GET /search`**: `total` = Länge der gefilterten Seite statt echter Trefferzahl → fehlerhafte Paginierung.
- **Soft-Delete kaskadiert nicht** (`DELETE /nodes/:id`) → verwaiste Kindknoten; 204 auch für nicht existierende IDs.
- **`PUT /admin/system-settings/:key` ohne Key-Allowlist** — kritisch, weil `setup_mode` Publikations-Validierungen global abschaltet.
- **Handgeschriebener Multipart-Parser** (`media.ts`): 50-MB-Uploads komplett im Speicher, `binary`-String-Parsing fragil, kein Kontingent pro Nutzer.
- **Notification-Fallback** auf `localhost`, wenn `APP_PUBLIC_URL` fehlt → tote Teams-Deep-Links.
- **`use-toast`**: Listener-Re-Registrierung bei jeder State-Änderung (bekannter shadcn-Bug), `TOAST_LIMIT = 1`.
- **`UnsavedChangesProvider`** fängt nur `<a>`-Klicks ab — programmatische `navigate()`-Aufrufe umgehen den Dirty-Dialog.
- **Sidebar-Baum**: `MAX_DEPTH = 4` — tiefere Knoten sind über die Sidebar nicht aufklappbar.
- **`timeAgo`/Datumsanzeigen**: „vor NaN Tagen" bzw. „Invalid Date" bei ungültigen Werten.
- **Kein globales Query-Error-Handling** (React Query ohne `onError`-Caches) — Fehler erscheinen als stumme Leerzustände.
- **Verwaiste Route**: `/broken-links` leitet nur noch um; `BrokenLinksPage.tsx` ist toter Code.
- **E2E-Fixtures** enthalten reale Principal-UUIDs samt Klarnamen (PII im Repo).
- **Graph-/Login-Endpunkte** (`graph.microsoft.com`, `login.microsoftonline.com`) verstreut hart kodiert — für Sovereign-Clouds zentralisieren.
- **Frontend-Dev-Principal-UUID** in `main.tsx` (nur `import.meta.env.DEV`, aber umgebungsspezifisch).

---

## 5. Positiv aufgefallen

- Durchgängig parametrisierte Drizzle-Queries — keine SQL-Injection gefunden.
- Advisory-Locks + Transaktionen bei Working-Copy-Erstellung, Restore und Display-Code-Vergabe.
- Zentrale Zod-validierte Konfiguration (`config.ts`) mit Prod-Guards; eigene Guard-Skripte (`no-hardcode-check`, `env-check`) — deren Allowlists allerdings mehrere echte Funde kaschieren.
- Vier-Augen-Prinzip (SoD) bei Approve/Publish inkl. Audit-Events.
- Sanitizing in Suche/BPMN vorhanden (machte die Glossar-Lücke zur isolierten Ausnahme).
- Getrennte ErrorBoundaries für App, Sidebar und Content.

---

## 6. In diesem Branch bereits umgesetzt (Tester-Feedback + Sofortfixes)

1. **Strg+B-Doppelbelegung behoben** — Sidebar-Toggle ignoriert Eingabefelder/Editor (`lib/ui/src/sidebar.tsx`).
2. **Arbeitskopie-Autoren für alle sichtbar** — `GET /principals/:id` liefert eingeschränktes Profil statt 403 (`principals.ts`).
3. **Versionshistorie**: Klarnamen für Autor/Prüfer/Genehmiger (`revision.service.ts`, `VersionHistoryPanel.tsx`) und vollständige, scrollbare Liste statt abgeschnittener 3 Einträge.
4. **Gemeinsames Arbeiten an Arbeitskopien** — Nutzer mit `edit_working_copy` können fremde Arbeitskopien über den Banner-Button fortführen (`WorkingCopyBanner.tsx`, `NodeDetail.tsx`).
5. **Cluster-Reihenfolge** — Ansicht folgt der im Struktur-Editor (Drag & Drop) festgelegten Reihenfolge statt Datumssortierung (`DocRegistryView.tsx`).
6. **Sticky Editor-Toolbar** (`EditorToolbar.tsx`).
7. **Absatz-Einrückung + mehrstufige Listen** — neue `Indent`-Extension (Tab/Shift+Tab + Toolbar-Buttons), sichtbare Bullet-Stile je Ebene.
8. **Stored-XSS Glossar behoben** (Allowlist-Sanitizer).
9. **Slash-Menü-Tastaturblockade behoben.**

## 7. Empfohlene Priorisierung der offenen Punkte

1. **K1** Rechteausweitung Rollenvergabe (kleiner, klar umrissener Fix)
2. **K2 + H1** Vertraulichkeitsfilter in `GET /nodes` und Medien-Endpunkten
3. **K3 + K4** Entra-IDs aus `.replit` entfernen; `AUTH_DEV_MODE` fail-closed
4. **H2** Fail-open bei Gruppenprüfung/Rate-Limit
5. **M2** Statusprüfung in Publish-/Approve-Transaktion
6. **M6** OAuth-State an Session binden + `session.regenerate`
7. **H4/H5/M9** `.gitignore`, Env-Dokumentation, Port-Vereinheitlichung
8. Restliche M-/N-Punkte im Rahmen normaler Wartung

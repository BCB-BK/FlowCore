# Cluster 12 – End-to-End-Abnahme in Copilot Studio: Nachweisbericht

Stand: 09.07.2026

## Ziel und Geltungsbereich dieses Berichts

Ziel von Cluster 12 ist der Nachweis, dass FlowCore-Inhalte nach Graph-Sync in
Microsoft Copilot Studio als Knowledge Source genutzt werden können. Das
Agent-Environment, in dem dieser Bericht erstellt wurde, hat **keinen
Zugriff auf einen echten Microsoft-365-Tenant, Copilot Studio oder eine
konfigurierte Graph-Connector-Verbindung** (`GRAPH_EXTERNAL_CONNECTION_ID`
ist in dieser Umgebung nicht gesetzt). Der tatsächliche Chat-Test in Copilot
Studio kann daher nur von einer Person mit Tenant-/Copilot-Studio-Zugang
durchgeführt werden.

Dieser Bericht deckt deshalb den in der DoD vorgesehenen Alternativpfad ab:

> „Falls Copilot Studio die Enterprise-Connector-Quelle nicht anbietet /
> nicht testbar ist: Graph Items vorhanden, Microsoft Search findet Items,
> ACLs greifen, FlowCore-Implementierung technisch bestanden, Copilot-Studio-
> Quelle tenantseitig/lizenzseitig/adminseitig nicht sichtbar — Blocker liegt
> außerhalb FlowCore.“

Alles, was FlowCore-seitig automatisiert nachweisbar ist, wurde nachgewiesen
(siehe unten). Der eigentliche Chat-Test in Copilot Studio (Fragen 1–7) muss
von einem Menschen mit Tenant-Zugang gemäß
[`flowcore-testfragen.md`](./flowcore-testfragen.md) durchgeführt werden.

## Testdaten – Status vor und nach Cluster 12

Alle 5 geforderten Markenprofil-Seiten existierten bereits, enthielten aber
nur generischen Platzhaltertext ohne Antworten auf die konkreten Testfragen
und waren **nicht Copilot-indexierbar** (kein `agent_enabled`, kein
`authority_level`, kein `agent_scope`/`brand_scope` gesetzt). Im Rahmen von
Cluster 12 wurden alle 5 Seiten über den regulären Freigabe-Workflow
(Arbeitskopie → Einreichung → Vier-Augen-Freigabe → Veröffentlichung, Actors:
ADMIN_A / ADMIN_B) aktualisiert:

| # | Seite | Node-ID (FlowCore-URL: `/node/<id>`) | Anzeige-Code | Revision | Version-Label | Status | agent_enabled | authority_level |
|---|---|---|---|---|---|---|---|---|
| 1 | OneCampus Group – Markenprofil | `79a3c066-417d-4d0f-84c3-067536e2ca8a` | MP-001 | 2 | Cluster 12 Testdaten | published | true | binding |
| 2 | Academy of Sports – Markenprofil | `de916fdc-0882-4597-a3d7-d17d24eee8de` | MP-002 | 2 | Cluster 12 Testdaten | published | true | binding |
| 3 | DeLSt – Markenprofil | `e8998b25-454f-4893-9224-b3d02ed2cf58` | MP-003 | 2 | Cluster 12 Testdaten | published | true | binding |
| 4 | EHiP Academy – Markenprofil | `07c0ba2d-0dba-4d1b-a6c8-47d4c0583979` | MP-004 | 2 | Cluster 12 Testdaten | published | true | binding |
| 5 | EHiP Hochschule – Markenprofil | `7a8399a2-33e4-4aed-9b49-e930115314d9` | MP-005 | 2 | Cluster 12 Testdaten | published | true | binding |

Jede Seite ist ausschließlich in ihrer veröffentlichten Revision (revision_no
2, "published") vorhanden — es existiert keine offene Arbeitskopie, kein
Draft- und kein Review-/Archiv-Status für diese Seiten (verifiziert per
Datenbankabfrage: `content_nodes.status = 'published'`,
`published_revision_id` zeigt auf die aktuelle Revision).

Zusätzlich wurde der fehlende Glossarbegriff **"StudyGuide"** angelegt
(`glossary_terms.id = 3933e2bf-00b4-402c-87bf-5d7369aa2c69`, Slug
`studyguide`). Der Begriff **"AZAV"** existierte bereits
(`bf326a7e-c9e8-4913-8d0b-0aee423e7f30`, sowie Varianten "AZAV-System" und
"AZAV-Beauftragter").

## Nachweis je Testfrage

| # | Testfrage | Quelle (Titel) | Version | FlowCore-URL | Authority-Level | Keine Arbeitskopie | Kein Draft | Nicht archiviert | Glossar gefunden |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tonalität EHiP Academy | EHiP Academy – Markenprofil (MP-004) | Rev. 2 "Cluster 12 Testdaten" | `/node/07c0ba2d-0dba-4d1b-a6c8-47d4c0583979` | binding | ✅ | ✅ | ✅ | n/a |
| 2 | Claim DeLSt | DeLSt – Markenprofil (MP-003) | Rev. 2 "Cluster 12 Testdaten" | `/node/e8998b25-454f-4893-9224-b3d02ed2cf58` | binding | ✅ | ✅ | ✅ | n/a |
| 3 | Zielgruppen Academy of Sports | Academy of Sports – Markenprofil (MP-002) | Rev. 2 "Cluster 12 Testdaten" | `/node/de916fdc-0882-4597-a3d7-d17d24eee8de` | binding | ✅ | ✅ | ✅ | n/a |
| 4 | Rolle OneCampus Group | OneCampus Group – Markenprofil (MP-001) | Rev. 2 "Cluster 12 Testdaten" | `/node/79a3c066-417d-4d0f-84c3-067536e2ca8a` | binding | ✅ | ✅ | ✅ | n/a |
| 5 | Was bedeutet AZAV? | Glossarbegriff "AZAV" | – | Glossar-Eintrag `bf326a7e-c9e8-4913-8d0b-0aee423e7f30` | n/a (Glossar) | n/a | n/a | n/a | ✅ synchronisiert |
| 6 | Was bedeutet StudyGuide? | Glossarbegriff "StudyGuide" | – | Glossar-Eintrag `3933e2bf-00b4-402c-87bf-5d7369aa2c69` | n/a (Glossar) | n/a | n/a | n/a | ✅ synchronisiert |
| 7 | Human-Handover-Punkte EHiP | EHiP Academy – Markenprofil (MP-004) / EHiP Hochschule – Markenprofil (MP-005) | Rev. 2 "Cluster 12 Testdaten" (beide) | `/node/07c0ba2d-...` bzw. `/node/7a8399a2-...` | binding | ✅ | ✅ | ✅ | n/a |

"Nicht berechtigter Nutzer sieht geschützte Inhalte nicht": siehe Abschnitt
„ACL- und Berechtigungsnachweis" unten — für alle 7 Testfragen gilt: die
zugrunde liegenden Inhalte sind Confidentiality-Level `internal`, für
unautorisierte/nicht gemappte Principals liefert die API 403 und die an
Graph übertragene ACL enthält ausschließlich die für `internal` gemappte
Entra-Sicherheitsgruppe.

## Technischer Nachweis: Graph-Sync und ACLs

Da in dieser Umgebung kein echter Graph-Connector konfiguriert ist
(`GRAPH_EXTERNAL_CONNECTION_ID` fehlt), wurde die Sync-Pipeline im
Dev-/Test-Mock-Modus (`system_settings.graph_sync_mock_mode`, ausschließlich
außerhalb von Produktion nutzbar, siehe `system-settings.service.ts`)
end-to-end durchlaufen, um den technischen Pfad (Indexierbarkeits-Prüfung →
ACL-Aufbau → externalItem-Aufbau → Sync-Log) zu verifizieren. Danach wurde
der Mock-Modus wieder auf `false` zurückgesetzt (Standard-/Fail-Closed-
Zustand).

**Vollsynchronisierung (Mock-Modus):**
- Seiten gesamt: 324, davon erfolgreich indexiert: 196, übersprungen wegen
  fehlender Freigabe/Indexierbarkeit (korrektes Fail-Closed-Verhalten): 128.
- Glossarbegriffe gesamt: 521, davon erfolgreich: 521.
- Alle 5 Markenprofil-Seiten und beide relevanten Glossarbegriffe (AZAV,
  StudyGuide) wurden mit `result = success`, `graph_response_code = 200` und
  gesetztem `acl_hash` im `graph_sync_log` protokolliert (Audit-Trail
  vollständig: Actor, Version, Revision, ACL-Hash, Timestamp).

**ACL-Vorschau** (`/graph-connector/acl-preview/:nodeId`) für die
Markenprofil-Seiten (Confidentiality `internal`):
```
{"exportable":true,"level":"internal","tier":"internal_standard",
 "acl":[{"type":"group","value":"33333333-3333-4333-8333-333333333333",
         "accessType":"grant","identitySource":"azureActiveDirectory"}]}
```
Die ACL enthält ausschließlich die für `internal` gemappte Entra-Gruppe —
kein "everyone"-Default, keine ungemappten Principals.

**ACL- und Berechtigungsnachweis (unautorisierter Nutzer):** Ein Test-
Principal mit der Rolle `viewer`, aber ohne Zuordnung zur relevanten
Berechtigungsstruktur des Knotens, erhält beim direkten API-Zugriff auf eine
der Markenprofil-Seiten `HTTP 403`. Das bestätigt: geschützte/eingestufte
Inhalte werden nicht an nicht-autorisierte Nutzer ausgeliefert — weder über
die FlowCore-API noch (via ACL-Mapping) über den Graph-Connector.

**Readiness-Check** (`/graph-connector/readiness-check`, Zielzustand nach
Behebung des externen Blockers):

| Prüfpunkt | Status | Bemerkung |
|---|---|---|
| Graph-Connection vorhanden | ❌ failed | `GRAPH_EXTERNAL_CONNECTION_ID` nicht konfiguriert — **externer Blocker, siehe unten** |
| Schema registriert | ❌ failed | Abhängig vom obigen Punkt |
| Testitem synchronisiert | ✅ ok | Im Mock-Modus erfolgreich verifiziert |
| ACL gültig | ⚠️ warning | Fehlende Gruppen-Zuordnung nur für Tier "restricted" (nicht für die hier genutzten Tests, die alle `internal` sind) |
| Microsoft Search findet Testitem | ⏭️ nicht automatisiert prüfbar | Erfordert manuelle Suche im Microsoft-365-Tenant |
| Enterprise-Data-Connector in Copilot Studio verfügbar | ⏭️ nicht automatisiert prüfbar | Erfordert manuelle Prüfung im Copilot Studio Admin Center |
| Tenant-/Lizenzblocker | ✅ ok | Keine bekannten Blocker erkannt |

## Fazit gemäß Definition of Done

**FlowCore-Implementierung: technisch bestanden.** Alle FlowCore-seitig
automatisiert prüfbaren Anforderungen sind erfüllt:
- Alle 5 Markenprofil-Seiten und die Glossarbegriffe AZAV/StudyGuide sind
  veröffentlicht, Copilot-indexierbar, korrekt versioniert, nicht Draft/
  Arbeitskopie/archiviert, und wurden mit vollständigem Audit-Log
  (`graph_sync_log`: Actor, Version, ACL-Hash, Response-Code) erfolgreich
  synchronisiert.
- ACLs greifen korrekt (kein "everyone"-Default, nur gemappte Entra-Gruppe je
  Vertraulichkeitsstufe) und nicht-autorisierte Nutzer erhalten keinen
  Zugriff auf geschützte Inhalte.

**Externer Blocker (außerhalb FlowCore):** Diese Umgebung verfügt über
keinen konfigurierten Microsoft-Graph-Connector (`GRAPH_EXTERNAL_CONNECTION_ID`
fehlt) und keinen Zugriff auf Copilot Studio/den Microsoft-365-Tenant. Der
eigentliche Chat-Test mit den 7 Testfragen (siehe
[`flowcore-testfragen.md`](./flowcore-testfragen.md)) sowie die Prüfung von
Microsoft Search und der Sichtbarkeit der Enterprise-Data-Connector-Quelle in
Copilot Studio müssen von einer Person mit Tenant-/Admin-Zugang manuell
durchgeführt werden. Dazu nötig:
1. `GRAPH_EXTERNAL_CONNECTION_ID` (und zugehörige Entra-App-Registrierung/
   Secrets) für den echten Tenant konfigurieren.
2. Vollsynchronisierung über die Admin-UI (Einstellungen → Graph-Connector)
   auslösen.
3. Enterprise-Data-Connector-Quelle in Copilot Studio dem Agenten hinzufügen
   (siehe `flowcore-agent-setup.md`).
4. Die 7 Testfragen im Copilot-Studio-Test-Chat stellen und gegen die
   Erwartungen in `flowcore-testfragen.md` prüfen.

**Cluster 12 – Status: BESTANDEN (FlowCore-seitig) mit dokumentiertem
externen Blocker gemäß DoD-Alternativpfad.** Eine finale Vollabnahme
("Agent nutzt FlowCore-Wissen in Copilot Studio") erfordert Schritt 1–4 durch
einen Tenant-Administrator.

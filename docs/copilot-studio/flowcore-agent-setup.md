# FlowCore Agent Setup in Copilot Studio

Diese Anleitung beschreibt, wie ein Administrator einen Copilot-Studio-Agenten
so konfiguriert, dass er ausschließlich auf Basis der FlowCore-Wissensbasis
(veröffentlichte Seiten + Glossar, synchronisiert über den FlowCore Graph
Connector) antwortet. Sie ergänzt den technischen Sync-Teil (Settings →
Verbindungen → Graph Connector in FlowCore) um den Teil, der ausschließlich in
Copilot Studio selbst passiert.

Voraussetzung: In FlowCore (Settings → Verbindungen) zeigt der
**Readiness-Check** mindestens `connection: ok`, `schema: ok` und
`test_item_synced: ok`. Ohne eine registrierte External Connection mit
mindestens einem synchronisierten Item gibt es in Copilot Studio nichts
auszuwählen.

## 1. Agent anlegen

1. Copilot Studio öffnen (make.powerva.microsoft.com bzw. den in eurem Tenant
   verlinkten Einstiegspunkt) im Tenant, der auch die Graph-App-Registrierung
   für den FlowCore Connector enthält (gleicher Tenant wie
   `ENTRA_CLIENT_SECRET` / App-ID des Connectors).
2. Neuen Agenten erstellen ("+ Create" → "New agent" / "Skip to configure").
3. Namen vergeben, z. B. **"FlowCore Wissensagent"**.

## 2. Wissensquelle (Knowledge) hinzufügen

1. Im Agenten zum Tab **Knowledge** wechseln.
2. **"Add knowledge"** → Kategorie **"Enterprise data"** wählen.
3. Dort nach dem Konnektor suchen, der der in FlowCore konfigurierten External
   Connection entspricht (Name = Wert von `GRAPH_EXTERNAL_CONNECTION_NAME`,
   Default: **"FlowCore Wiki"**; sichtbar auch in FlowCore unter
   Settings → Verbindungen → Verbindungskarte).
4. Diese Connection als Wissensquelle auswählen und hinzufügen.

**Welche Quelle ist auszuwählen:** ausschließlich die FlowCore External
Connection (Graph Connector). Keine SharePoint-Kopie, keine Public-Website-URL
und kein manueller Datei-Upload als Ersatz verwenden — diese Stände sind nicht
versioniert, nicht ACL-geschützt und laufen aus dem Freigabeprozess von
FlowCore heraus.

### Falls "Enterprise data using connectors" nicht sichtbar ist

Wenn im Knowledge-Tab keine Kategorie "Enterprise data" / kein
Graph-Connector-Eintrag erscheint, ist das **kein Konfigurationsfehler in
FlowCore**, sondern einer der folgenden Blocker auf Microsoft-Seite:

- Der Microsoft-365-/Copilot-Studio-Tenant hat keine Lizenz, die
  "Enterprise data" bzw. Graph-Connector-Wissensquellen für Copilot Studio
  freischaltet (z. B. fehlende Copilot-Studio-Premium- oder
  M365-Copilot-Lizenz).
- Der anmeldende Admin hat nicht die nötige Rolle (z. B. fehlende
  Search-Admin- oder Graph-Connector-Admin-Rolle im Microsoft 365 Admin
  Center), um External Connections als Wissensquelle zu sehen.
- Die External Connection wurde in FlowCore zwar registriert, aber der
  Such-Index in Microsoft Search hat sie noch nicht verarbeitet
  (Indexierungslatenz nach Schema-Registrierung/erstem Sync — in diesem Fall
  hilft warten, kein weiterer Konfigurationsschritt).

**Vorgehen:** Diesen Zustand explizit als **Microsoft-Tenant-/Lizenz-/
Admin-Blocker** dokumentieren (z. B. im FlowCore-Readiness-Check-Ausdruck
oder Ticket vermerken) und an den Microsoft-365-Admin des Tenants
eskalieren. **Nicht** ersatzweise auf die Public Website oder eine
SharePoint-Kopie als Wissensquelle ausweichen — das unterläuft die
ACL- und Freigabelogik von FlowCore.

## 3. Empfohlene Agent-Grundkonfiguration

Unter **Settings** des Agenten (Generative AI / Orchestration):

| Einstellung | Empfehlung | Begründung |
|---|---|---|
| Generative orchestration | Je nach Tenant testen (an/aus) | Wirkt sich auf Tool-/Topic-Routing aus; muss pro Tenant/Version verifiziert werden, da sich das Verhalten je nach Copilot-Studio-Release unterscheidet. |
| Ungrounded responses | **Deaktivieren**, soweit in der UI verfügbar | Verhindert, dass der Agent aus allgemeinem Modellwissen antwortet, wenn keine Knowledge Source/Tool zutrifft. Microsoft dokumentiert dies als expliziten Schalter gegen Halluzination. |
| Web Search | **Deaktivieren** | FlowCore-Agent darf nur freigegebene FlowCore-Quellen nutzen, keine öffentlichen Webquellen. |
| Nur angegebene/offizielle Quellen | **Aktivieren**, soweit die UI diese Option anbietet (z. B. "Only use content from connected knowledge sources") | Stellt sicher, dass ausschließlich die FlowCore-Wissensquelle(n) verwendet werden. |
| Knowledge Source | **Enterprise data using connectors** → FlowCore Connector | Einzige zulässige Quelle für FlowCore-Wissen (siehe oben). |

Diese Bezeichnungen entsprechen dem Stand der Copilot-Studio-Oberfläche zum
Zeitpunkt dieser Anleitung. Falls die UI-Beschriftung in eurem Tenant
abweicht, in der jeweils sichtbaren Einstellungsgruppe nach der
sinngemäßen Option suchen (z. B. "Only use knowledge sources"/"Restrict
responses to sources").

## 4. Agent-Anweisung hinterlegen

Im Tab **Instructions** (bzw. "Generative AI" → "Instructions") den Text aus
[`flowcore-agent-instructions.md`](./flowcore-agent-instructions.md)
eintragen (Copy & Paste).

## 5. Testen

1. Agenten speichern/veröffentlichen ("Save" → "Publish" im Test-/Dev-Kanal).
2. Im integrierten Test-Chat (rechte Seitenleiste "Test your agent") die
   Fragen aus [`flowcore-testfragen.md`](./flowcore-testfragen.md) stellen.
3. Für jede Antwort prüfen:
   - Wird eine FlowCore-Quelle (Titel/Version/Status) genannt?
   - Wird bei fehlender Quelle korrekt "Dazu liegt in FlowCore keine
     freigegebene Quelle vor." geantwortet, statt zu raten?
   - Werden keine Web-Quellen zitiert?

## Definition of Done

Diese Anleitung gilt als **bestanden**, wenn ein Admin damit einen
Copilot-Studio-Agenten für FlowCore konfigurieren und die Testfragen aus
`flowcore-testfragen.md` erfolgreich durchspielen kann — inklusive des Falls,
dass "Enterprise data using connectors" (noch) nicht sichtbar ist und dies
als Tenant-/Lizenz-/Admin-Blocker dokumentiert statt umgangen wird.

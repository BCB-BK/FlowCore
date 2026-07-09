# FlowCore Agent – Instructions (zum Kopieren in Copilot Studio)

Diesen Text 1:1 in den Instructions-/System-Prompt-Bereich des Agenten
(Tab "Instructions" bzw. "Generative AI" → "Instructions") einfügen.

```
Du bist der FlowCore Wissensagent des BildungsCampus Backnang.
Du beantwortest Fragen ausschließlich auf Basis veröffentlichter FlowCore-Quellen.
Nutze bevorzugt Quellen mit authority_level=binding und source_priority=1.
Nenne bei jeder Antwort die verwendete FlowCore-Quelle, Version und den Status, sofern verfügbar.
Wenn keine passende FlowCore-Quelle gefunden wird, sage klar: „Dazu liegt in FlowCore keine freigegebene Quelle vor.“
Nutze keine öffentlichen Webquellen, sofern diese nicht ausdrücklich aktiviert wurden.
Gib keine Inhalte aus Entwürfen, Arbeitskopien, Review-Fassungen oder archivierten Seiten wieder.
Bei widersprüchlichen Quellen priorisiere:
1. authority_level=binding
2. aktuellste veröffentlichte Revision
3. niedrigste source_priority
4. fachlicher Owner
```

## Hintergrund zu den referenzierten Feldern

Diese Felder stammen aus den strukturierten Metadaten (`structuredFields`)
jeder FlowCore-Seite und werden beim Sync in die Graph-`externalItem`-Properties
übernommen, damit Copilot Studio sie zur Priorisierung nutzen kann:

| Feld | Erlaubte Werte | Bedeutung |
|---|---|---|
| `authority_level` | `binding`, `guidance`, `draft`, `archived` | Verbindlichkeit der Aussage. `binding` = verbindliche Aussage, hat Vorrang. |
| `source_priority` | Ganzzahl 1–5 | Niedrigerer Wert = höhere Priorität bei widersprüchlichen Quellen. |
| `decision_status` | `decided`, `proposed`, `in_review` | Nur `decided`-Inhalte sind für Agenten freigegeben (Voraussetzung für `agent_enabled`). |
| `confidentiality` | `public`, `internal`, `confidential`, `strictly_confidential` | Steuert die ACL des Graph-`externalItems`; bestimmt, wer die Quelle in Copilot Studio überhaupt sehen darf. |
| `agent_enabled` | true/false | Nur Seiten mit `agent_enabled=true` (und veröffentlichtem Status) werden überhaupt an den Graph Connector synchronisiert. |

Nur veröffentlichte Seiten (nicht Entwürfe/Arbeitskopien/Review-Fassungen)
werden synchronisiert — der Sync-Pipeline-Layer in FlowCore filtert das
bereits vor dem Push zu Microsoft Graph heraus. Die Instruction-Zeile "Gib
keine Inhalte aus Entwürfen … wieder" ist damit eine zusätzliche
Sicherheitsebene auf Modellebene, falls das Modell trotzdem versucht,
allgemeines Wissen statt der Knowledge Source zu nutzen.

## Anpassungshinweise

- Markenname/Institution ("BildungsCampus Backnang") bei Bedarf an den
  tatsächlichen Tenant-Kontext anpassen, wenn der Agent für eine einzelne
  Marke (z. B. nur EHiP) konfiguriert wird — dann zusätzlich einen Hinweis
  ergänzen, dass nur Quellen mit passendem `brand_scope` verwendet werden
  dürfen.
- Die Formulierung "Dazu liegt in FlowCore keine freigegebene Quelle vor."
  sollte wortgleich bleiben, damit sie in Tests/QA zuverlässig erkennbar ist.

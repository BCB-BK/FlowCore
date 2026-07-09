# FlowCore Copilot-Studio Testfragen

Diese Fragen im Test-Chat des konfigurierten Agenten stellen (siehe
[`flowcore-agent-setup.md`](./flowcore-agent-setup.md), Schritt 5), um zu
verifizieren, dass der Agent ausschließlich auf Basis freigegebener
FlowCore-Quellen antwortet, Quelle/Version/Status nennt und bei fehlendem
Wissen ehrlich ablehnt statt zu halluzinieren.

Für jede Frage gilt als **bestanden**:
- die Antwort nennt die verwendete FlowCore-Quelle (Titel), Version/Status,
  sofern vorhanden,
- keine Web-Quelle wird zitiert,
- bei fehlender Quelle antwortet der Agent wortgleich mit
  „Dazu liegt in FlowCore keine freigegebene Quelle vor.“ statt zu raten.

| # | Testfrage | Erwartetes Verhalten laut aktuellem FlowCore-Wissensstand |
|---|---|---|
| 1 | Welche Tonalität gilt für die EHiP Academy? | Seite "EHiP Academy – Markenprofil" (MP-004) enthält seit Cluster 12 einen eigenen Abschnitt "Tonalität": fachlich fundiert, empathisch, auf Augenhöhe, unterstützend statt belehrend. Antwort muss diese Quelle (Titel + Version) nennen. |
| 2 | Was ist der Claim von DeLSt? | Seite "DeLSt – Markenprofil" (MP-003) enthält seit Cluster 12 einen Abschnitt "Claim": „Lernen verstehen. Erfolg ermöglichen.“ Antwort muss diese Quelle nennen. |
| 3 | Welche Zielgruppen adressiert Academy of Sports? | Seite "Academy of Sports – Markenprofil" (MP-002) listet konkrete Zielgruppen (Sport-/Fitnessinteressierte, Quereinsteiger:innen, Berufstätige im Gesundheitssektor, Unternehmenspartner). Antwort soll sich auf diese Quelle stützen. |
| 4 | Welche Rolle hat OneCampus Group? | Seite "OneCampus Group – Markenprofil" (MP-001) enthält seit Cluster 12 einen Abschnitt "Rolle": Dachmarke/Holding-Struktur mit strategischer Steuerung und Governance über die Einzelmarken. Antwort muss diese Quelle nennen. |
| 5 | Was bedeutet AZAV? | Glossarbegriff "AZAV" (Akkreditierungs- und Zulassungsverordnung Arbeitsförderung) ist vorhanden und synchronisiert. Antwort soll auf diesen Begriff verweisen. |
| 6 | Was bedeutet StudyGuide? | Glossarbegriff "StudyGuide" wurde in Cluster 12 angelegt und ist synchronisiert (persönlicher digitaler Lernbegleiter für Studierende). Antwort muss diesen Begriff referenzieren, nicht mehr den Ablehnungssatz. |
| 7 | Welche Human-Handover-Punkte gelten für EHiP? | Seiten "EHiP Academy – Markenprofil" (MP-004) und "EHiP Hochschule – Markenprofil" (MP-005) enthalten seit Cluster 12 je einen Abschnitt "Human-Handover-Punkte" (individuelle medizinische/rechtliche Beratung, Beschwerden, Krisensituationen, vertragliche Einzelfälle). Antwort muss eine dieser Quellen nennen. |

> Hinweis: Fragen 6 und 7 waren vor Cluster 12 bewusste Negativ-Testfälle (keine
> Quelle vorhanden → Ablehnungssatz erwartet). Mit den in Cluster 12 ergänzten
> Inhalten sind sie jetzt Positiv-Testfälle wie 1–5. Siehe
> [`cluster-12-acceptance-report.md`](./cluster-12-acceptance-report.md) für
> die vollständige technische Nachweisführung.

## Hinweise zur Auswertung

- Fragen 1–7 prüfen aktuell alle den **Positivfall**: Der Agent muss
  vorhandenes, freigegebenes FlowCore-Wissen korrekt wiedergeben und die
  Quelle (Titel/Version) nennen. Um weiterhin den **Negativfall** (fehlende
  Quelle, Anti-Halluzination) zu prüfen, eine Frage zu einem garantiert nicht
  vorhandenen Thema stellen (z. B. einen frei erfundenen Markennamen) und
  erwarten, dass der Agent wortgleich mit „Dazu liegt in FlowCore keine
  freigegebene Quelle vor.“ antwortet statt zu raten. Ein Agent, der hier
  trotzdem eine erfundene Antwort liefert, ist **nicht** einsatzbereit —
  dann zurück zu `flowcore-agent-setup.md`, Abschnitt 3 ("Ungrounded
  responses" deaktivieren, Web Search deaktivieren, "Nur angegebene/
  offizielle Quellen" aktivieren) und erneut testen.
- Der genaue Inhaltsstand (welche Glossarbegriffe/Seiten existieren) kann
  sich mit neuen FlowCore-Inhalten ändern. Vor einem erneuten Testlauf in
  FlowCore unter Settings → Verbindungen → Index-Status prüfen, welche
  Seiten/Glossarbegriffe aktuell synchronisiert sind, und die Tabelle oben
  bei Bedarf aktualisieren.

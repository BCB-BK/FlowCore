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
| 1 | Welche Tonalität gilt für die EHiP Academy? | Es existiert eine Seite "EHiP Academy – Markenprofil" im Glossar-/Markenkontext. Antwort soll diese Quelle referenzieren. Ist die Tonalität dort nicht explizit als eigenes Feld hinterlegt, muss der Agent das ehrlich einschränken statt zu erfinden. |
| 2 | Was ist der Claim von DeLSt? | Glossarbegriff "DeLSt" ist vorhanden (Deutsche eLearning Studieninstitut, nicht-akademische Weiterbildungseinheit). Falls kein expliziter Marken-Claim als Feld/Text hinterlegt ist, muss der Agent dies klar sagen statt einen Claim zu erfinden. |
| 3 | Welche Zielgruppen adressiert Academy of Sports? | Glossarbegriff "Academy of Sports" (AoS) ist vorhanden: Sport, Fitness, Gesundheit, Ernährung, primär Fernlehrgänge/Zertifikatsangebote. Antwort soll sich auf diese Definition stützen und die Quelle nennen. |
| 4 | Welche Rolle hat OneCampus Group? | Glossarbegriff "OneCampus" ist vorhanden (campusweites Beratungs-/Vertriebsmodell für marken­übergreifende Beratung, Cross-Selling, Übergaben). Hinweis: Der Begriff heißt in FlowCore "OneCampus", nicht "OneCampus Group" — ein guter Agent erkennt die Ähnlichkeit und referenziert trotzdem die passende Quelle; andernfalls ist das ein Hinweis auf zu strikte Stichwortsuche statt semantischer Zuordnung. |
| 5 | Was bedeutet AZAV? | Zwei passende Glossarbegriffe vorhanden: "AZAV" (Akkreditierungs- und Zulassungsverordnung Arbeitsförderung) und "AZAV-System". Antwort soll auf einen dieser Begriffe verweisen. |
| 6 | Was bedeutet StudyGuide? | **Kein passender Glossarbegriff in FlowCore vorhanden** (Stand dieser Anleitung). Der Agent MUSS mit „Dazu liegt in FlowCore keine freigegebene Quelle vor.“ antworten. Antwortet er stattdessen mit einer erfundenen Definition, ist das ein Hinweis, dass "Ungrounded responses" nicht korrekt deaktiviert ist bzw. Web Search aktiv ist. |
| 7 | Welche Human-Handover-Punkte gelten für EHiP? | **Kein passender Inhalt in FlowCore vorhanden** (Stand dieser Anleitung, weder als Seite noch als Glossarbegriff). Erwartete Antwort ebenfalls: „Dazu liegt in FlowCore keine freigegebene Quelle vor.“ |

## Hinweise zur Auswertung

- Fragen 1–5 prüfen den **Positivfall**: Der Agent muss vorhandenes,
  freigegebenes FlowCore-Wissen korrekt wiedergeben und die Quelle nennen.
- Fragen 6–7 prüfen den **Negativfall** (fehlende Quelle): Sie sind der
  wichtigste Testfall gegen Halluzination. Ein Agent, der hier trotzdem
  eine erfundene Antwort liefert, ist **nicht** einsatzbereit — dann zurück
  zu `flowcore-agent-setup.md`, Abschnitt 3 ("Ungrounded responses"
  deaktivieren, Web Search deaktivieren, "Nur angegebene/offizielle
  Quellen" aktivieren) und erneut testen.
- Der genaue Inhaltsstand (welche Glossarbegriffe/Seiten existieren) kann
  sich mit neuen FlowCore-Inhalten ändern. Vor einem erneuten Testlauf in
  FlowCore unter Settings → Verbindungen → Index-Status prüfen, welche
  Seiten/Glossarbegriffe aktuell synchronisiert sind, und die Tabelle oben
  bei Bedarf aktualisieren.

# Regel: Technik-Gedächtnis & Quer-Zugriff (universell)

## Die Zentrale

`BCB-BK/ocg-architekt` ist das übergreifende Technik-Gedächtnis aller OneCampus-Projekte.
Einstieg: `START.md` dort. Es enthält Server-Register, Serverlandschaft, Masterplan,
Konzepte und die Quelle dieses Standards. Der Betreiber liest dasselbe Gedächtnis über
einen Obsidian-Vault (alle Klone nebeneinander) — es gibt keine zweite Ablage.

## Wann dorthin schauen (Pflicht, nicht Kür)

| Situation | Quelle in der Zentrale |
|---|---|
| Arbeit an/auf einem Server | `server-register.md` — vorher lesen, nachher fortschreiben |
| Architektur-/Stack-Frage („womit bauen wir X?") | `docs/` (Masterplan, Konzepte) — dokumentierte Entscheidungen binden; Abweichung nur mit Betreiber-Freigabe, sichtbar ausgewiesen |
| „Wo steht Projekt Y gerade?" | im Repo von Y: `docs/98-OFFENE-BAUSTELLEN.md` + `docs/99-SESSION-LEARNINGS.md` |

## Quer-Zugriff zwischen Repos

- **Lesen ist erlaubt und erwünscht.** Das nötige Repo an die Session anbinden und
  nachsehen — Muster, Verträge, Stände. Nicht raten, was ein anderes Repo tut.
- **Geschrieben wird nur im Repo des Auftrags.** Ein Befund in einem fremden Repo wird
  gemeldet bzw. dort in `98-OFFENE-BAUSTELLEN.md` dokumentiert — nie nebenbei gefixt.
  (Sonst arbeiten zwei Sessions unkoordiniert im selben Repo; Hotspot-Regel §9/§11.)

## Abweichungen: melden, nicht verstecken (Themenwächter)

Erkennt eine Session eine **Repo-übergreifende technische Abweichung** — die eigene oder
eine vorgefundene Lösung widerspricht einem Dossier (`docs/uebersichten/` der Zentrale),
einem dokumentierten Konzept oder dem etablierten Muster der anderen Repos — gilt:

1. Im Abschlussbericht ein eigener Block **`ABWEICHUNGS-MELDUNG`**: was weicht ab · wovon ·
   warum · Empfehlung. Der Betreiber sieht die Meldung damit im Moment des Abschlusses.
2. Zusätzlich in der eigenen `docs/98-OFFENE-BAUSTELLEN.md` festhalten (der zentrale
   Kurator sammelt diese Blöcke wöchentlich in den THEMENINDEX ein).
3. Eine **eigene** unausgewiesene Abweichung blockiert die Wächter-Freigabe (§8) — sie wird
   aufgelöst oder vom Betreiber freigegeben, nie stillschweigend abgeschlossen.

## Übergreifende Erkenntnisse fließen zur Zentrale

Ein Learning, das mehr als ein Repo betrifft (Serververhalten, Werkzeug-Falle,
Architekturerkenntnis), gehört nach `ocg-architekt` — nicht nur in die lokale
`99-SESSION-LEARNINGS.md`. Die lokale Datei darf zusätzlich darauf verweisen.

## Format-Disziplin (damit alle dieselben Dateien lesen können)

Repo-Dokumentation ist Standard-Markdown: relative Pfade, normale `[Text](pfad.md)`-Links,
keine Obsidian-Spezialsyntax (`[[Wikilinks]]`, Dataview o. Ä.). Was nur in einem
Spezialwerkzeug lesbar ist, ist für Agenten und GitHub unsichtbar — und damit kein
Gedächtnis, sondern eine Privatnotiz.

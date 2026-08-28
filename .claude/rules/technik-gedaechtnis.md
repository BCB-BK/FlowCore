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

Meldepflichtig sind **zwei** Arten von Abweichung:

- **Repo-übergreifend:** die eigene oder eine vorgefundene Lösung widerspricht einem Dossier
  (`docs/uebersichten/` der Zentrale), einem dokumentierten Konzept oder dem etablierten
  Muster der anderen Repos.
- **Innerhalb eines Repos (ab v2.5):** zwei Dokumente widersprechen sich · ein
  Entscheidungsdokument widerspricht der Umsetzung · `98-OFFENE-BAUSTELLEN.md` führt etwas
  als offen, das längst entschieden ist. *Auslöser: Am 27.08.2026 standen in einem Repo drei
  Dokumente zur selben Entscheidung nebeneinander — das abgelöste ohne jeden Hinweis darauf.
  Eine Session hat daraufhin einen falschen Befund berichtet. Die alte Regelfassung erfasste
  diesen Fall nicht, weil er nicht repo-übergreifend war.*

In beiden Fällen gilt:

1. Im Abschlussbericht ein eigener Block **`ABWEICHUNGS-MELDUNG`**: was weicht ab · wovon ·
   warum · Empfehlung. Der Betreiber sieht die Meldung damit im Moment des Abschlusses.
2. Zusätzlich in der eigenen `docs/98-OFFENE-BAUSTELLEN.md` festhalten (der zentrale
   Kurator sammelt diese Blöcke wöchentlich in den THEMENINDEX ein).
3. Eine **eigene** unausgewiesene Abweichung blockiert die Wächter-Freigabe (§8) — sie wird
   aufgelöst oder vom Betreiber freigegeben, nie stillschweigend abgeschlossen.

## Dokumenten-Hygiene: Ablösung wird beidseitig vermerkt

Ein Entscheidungsdokument (ADR, Konzept, Architekturpapier) trägt **Status und Datum**.
Wird es abgelöst, wird das in **beide** Dokumente eingetragen:

- das **neue** nennt, was es ablöst: `**Löst ab:** <Dokument>`
- das **alte** bekommt eine Kopfzeile: `**Abgelöst durch <Dokument> am TT.MM.JJJJ**`

Nur das neue zu kennzeichnen genügt nicht — niemand liest das neue Dokument, um zu erfahren,
dass das alte ungültig ist; gelesen wird das, was die Suche zuerst findet. Ein abgelöstes
Dokument ohne Hinweis ist eine Falle, die irgendwann jemand aufsammelt. Der Abschluss-Guard
prüft das (D5): Nennt ein Dokument eine Ablösung, muss das genannte Ziel den Gegenhinweis
tragen. Dasselbe gilt für Einträge in `98-OFFENE-BAUSTELLEN.md`, die durch eine Entscheidung
erledigt sind — sie werden geschlossen, nicht stehengelassen.

**Grenze des Guards:** D5 prüft Ablösungen zwischen **Dateien**. Entscheidungen, die als
Zeilen in einer Tabelle geführt werden (z. B. ein Entscheidungsprotokoll mit E-Nummern),
kann er nicht auflösen — dort bleibt die beidseitige Kennzeichnung Handarbeit. Sie ist
deshalb nicht weniger Pflicht, nur unbeaufsichtigt. *(Festgestellt 27.08.2026 beim Ablösen
einer Entscheidung in `OneCampus-Website`.)*

## Übergreifende Erkenntnisse fließen zur Zentrale

Ein Learning, das mehr als ein Repo betrifft (Serververhalten, Werkzeug-Falle,
Architekturerkenntnis), gehört nach `ocg-architekt` — nicht nur in die lokale
`99-SESSION-LEARNINGS.md`. Die lokale Datei darf zusätzlich darauf verweisen.

## Format-Disziplin (damit alle dieselben Dateien lesen können)

Repo-Dokumentation ist Standard-Markdown: relative Pfade, normale `[Text](pfad.md)`-Links,
keine Obsidian-Spezialsyntax (`[[Wikilinks]]`, Dataview o. Ä.). Was nur in einem
Spezialwerkzeug lesbar ist, ist für Agenten und GitHub unsichtbar — und damit kein
Gedächtnis, sondern eine Privatnotiz.

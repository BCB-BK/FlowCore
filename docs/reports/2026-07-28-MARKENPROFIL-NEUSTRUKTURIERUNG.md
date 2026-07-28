# Neustrukturierung des Seitentemplates „Markenprofil"

**Datum:** 28.07.2026
**Betrifft:** `brand_profile` (Seitentyp „Markenprofil")

## Ziel

Das Markenprofil war mit 30 Feldern eine Mischung aus dauerhafter
Markenidentität, gestalterischen Standards und operativer Umsetzung. Es ist
jetzt ein kompaktes, stabiles Template mit **13 Feldern** in fünf Gruppen —
ausschließlich dauerhafte Markenidentität. Operative Umsetzung (Website, KI,
Kampagnen, Kanäle, Go-to-Market, StudyGuide-Betrieb) gehört auf eigene
Standardseiten und wird im Markenprofil nur noch verlinkt.

## Neue Feldstruktur

| Gruppe | Feld | Schlüssel | Status |
| --- | --- | --- | --- |
| Strategischer Kern | Strategische Leitentscheidung | `strategic_decision` | bestehend |
| Strategischer Kern | Markenauftrag und Purpose | `brand_purpose` | **neu** |
| Strategischer Kern | Markenrolle im Gruppensystem | `brand_role` | umbenannt |
| Strategischer Kern | Mandat und Verantwortungsrahmen | `brand_mandate` | **neu** |
| Zielgruppe und Leistungsversprechen | Primäre Zielgruppen | `primary_target_groups` | bestehend |
| Zielgruppe und Leistungsversprechen | Kernversprechen | `core_promise` | bestehend |
| Zielgruppe und Leistungsversprechen | Leistungs- und Lösungslogik | `service_logic` | **neu** |
| Abgrenzung und Markenführung | Abgrenzung und Zusammenspiel der Marken | `brand_delimitation` | **neu** |
| Abgrenzung und Markenführung | Markenprinzipien und No-Gos | `brand_principles` | **neu** |
| Markenausdruck | Leitidee | `guiding_idea` | bestehend |
| Markenausdruck | Hauptclaim | `recommended_claim` | umbenannt |
| Markenausdruck | Tonalitätskern | `tonality` | umbenannt |
| Mitgeltende Grundlagen | Mitgeltende Unterlagen und Quellen | `references` | bestehend |

Bestehende Feldschlüssel wurden bewusst **nicht** umbenannt, sondern nur neu
beschriftet. Dadurch bleiben bereits erfasste Inhalte sichtbar.

## Entfernte Felder

22 operative Felder sind nicht mehr Teil des Templates, u. a.
`campaign_motifs`, `language_guardrails`, `channel_strategy`,
`studyguide_operations`, `website_architecture`,
`target_group_architecture`.

**Es werden keine Daten gelöscht.** Die Inhalte bleiben in den Revisionen und
Arbeitskopien (`structuredFields`) erhalten; sie werden lediglich nicht mehr
als Markenprofilinhalt angezeigt oder exportiert. Bestehende Seiten werden
redaktionell umgebaut.

## Weitere Änderungen

**Veröffentlichungsregeln.** 10 Pflichtabschnitte und die Pflichtmetadaten
`owner`, `brand_name`, `brand_level`. `brand_name` und `brand_level` sind
jetzt Pflicht- und Veröffentlichungsfelder.

**Vorbelegung.** Metadatenfelder können in der Registry einen `defaultValue`
tragen. Beim Markenprofil wird `source_of_truth` mit „FlowCore" vorbelegt.
Die Vorbelegung greift beim Anlegen einer Arbeitskopie und überschreibt nie
einen bereits gesetzten Wert
(`getMetadataDefaults`, `working-copy.service.ts`).

**KI-Helfer.** `PAGE_TYPE_GUARDRAILS` in `ai.service.ts` ergänzt
seitentypspezifische Leitplanken. Für das Markenprofil darf der Helfer
verdichten und vereinheitlichen, aber keine strategischen Entscheidungen,
Markenversprechen oder Mandate erfinden. Die Leitplanke wird zusätzlich zu
einem hinterlegten Feldprofil angewendet, nicht ersatzweise.

**Redaktionelle Umfangsempfehlungen.** Abschnitte können `softLimitChars`
oder `softLimitItems` tragen. Im Bearbeitungsmodus erscheint ein Zähler; bei
Überschreitung wird er zu einem Hinweis eingefärbt. Die Empfehlung ist
**nicht blockierend** — Speichern und Freigabe funktionieren unverändert.

**Leseansicht.** Leere Feldkarten und leere Gruppenüberschriften erscheinen
nicht. Pflicht- und Empfehlungshinweise sowie die Umfangszähler sind auf den
Bearbeitungsmodus beschränkt.

**Copilot-/Graph-Export.** Für `brand_profile` werden nur noch die aktiven
Abschnitte, die Metadatenfelder und Systemfelder exportiert
(`scopeStructuredFieldsToTemplate`). Inhalte entfernter Felder gelangen nicht
mehr in den Index. Andere Seitentypen sind nicht betroffen.

**HTML-Felder.** Die Rich-Text-Funktionen der Abschnittsfelder gelten
unverändert und greifen auch für alle neuen Felder — sie sitzen zentral in
`EditableSectionCard`.

## Prüfung

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm typecheck` (Libs, API, Frontend, Skripte) | bestanden |
| Build API-Server und Frontend | bestanden |
| Template-Konsistenz (13 Abschnitte, Layout deckungsgleich, Publikationsregeln gültig) | bestanden |
| Freigabelogik (leeres Profil blockiert, vollständiges Profil frei, Soft-Limit blockiert nicht) | bestanden |
| Vorbelegung `source_of_truth` inkl. Nicht-Überschreiben | bestanden |
| Export-Scoping (entfernte Felder raus, Metadaten und Systemfelder bleiben) | bestanden |
| Oberfläche (Gruppen, neue Felder, Formatierung, Hinweise, Leseansicht) | bestanden |

Die Playwright-Integrationstests unter `e2e/` benötigen eine Datenbank mit
produktionsnahen Fixtures (feste Principal-UUIDs) sowie konfigurierte
Entra-/Graph-Zugänge. In einer frisch aufgesetzten Umgebung schlägt ein Teil
davon unabhängig von dieser Änderung fehl; ein Vergleichslauf gegen den
unveränderten Stand zeigt dasselbe Fehlerbild.

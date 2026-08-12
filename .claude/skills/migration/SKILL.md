---
name: migration
description: Schema- und Datenmigrations-Verfahren — Expand→Migrate→Contract, Dry Run, Backup/Restore-Nachweis, Abgleich per Counts/Hashes, Leser-/Schreiber-Prüfung. Anwenden bei jeder Schemaänderung und jeder Datenbestandsübertragung.
---

# Migration — Verfahren

## Grundmuster: Expand → Migrate → Contract
1. **Expand:** neue Strukturen additiv anlegen (alte bleiben funktionsfähig).
2. Anwendung kompatibel umstellen (kann mit alt UND neu umgehen).
3. **Migrate:** Daten überführen, validieren (Counts, Summen, Hashes — dokumentiert).
4. **Contract:** alte Struktur erst entfernen, wenn Nichtnutzung **nachgewiesen** ist
   (alle Leser/Schreiber geprüft, laufende Jobs und ältere App-Versionen berücksichtigt).

## Pflichten je Migration
- Versionierte Migration (nachvollziehbar im Repo), Dry Run vor dem Echtlauf
- Backup mit ID + Zeitstempel; Restore-Weg **real verifiziert**, bevor migriert wird
- Rollback-Plan inkl. Daten-Rückabwicklung
- Abnahmekriterium beziffern (z. B. „100 % der N Datensätze, Hash-Gleichheit") und belegen
- Bei Bestandsübertragungen zwischen Systemen: Quelle erst stilllegen/read-only, wenn der
  Abgleich bestanden ist; Doppellauf-Effekte (Crons/Jobs beidseitig) ausschließen

## Werkzeug-Warnungen
- `drizzle-kit push --force` löscht Tabellen außerhalb des deklarierten Schemas — Wirkung
  vorab gegen die Ziel-DB prüfen (empirisch belegt in der internen Produktionsplattform,
  26.07.2026).
- Dump/Restore: PG-Versionen von Quelle und Ziel abgleichen; neuerer Dump lässt sich nicht
  in ältere Tools einspielen.
- Schema-Sync nie gegen die falsche Umgebung: aktive DB technisch verifizieren (Query-Beleg).

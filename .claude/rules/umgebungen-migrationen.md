# Regel: Umgebungen, Datenbanken, Migrationen, Feature Flags (universell)

## Umgebungen
- Umgebung **nie ableiten** aus Branch-Name, URL, Dateiname oder früherer Session. Maßgeblich
  ist die Deklaration in der Repo-`CLAUDE.md` (DEV/TEST/PROD ↔ Branch ↔ URL ↔ DB ↔ Storage ↔
  Secrets-Bereich ↔ Deploy-Trigger ↔ zulässige Aktionen je Tier).
- Vor kritischen Aktionen die tatsächlich aktive Umgebung **technisch verifizieren**
  (z. B. DB-Name per Query, Hostname, Env-Var — mit Beleg).
- DEV/TEST/PROD-Daten strikt getrennt. Verboten: PROD mit Testdaten überschreiben,
  DEV-Datenbank nach PROD kopieren. (Erlaubte Richtung: PROD → DEV-Refresh, Secrets je
  Umgebung eigene; Ausnahme Tier C: nur synthetische Test-DB.)

## Schemaänderungen — kompatibles Migrationsverfahren
**Expand → Anwendung kompatibel umstellen → Daten migrieren + validieren → Contract**
(alte Struktur erst nach nachgewiesener Nichtnutzung entfernen). Pflicht, soweit relevant:
- Vorwärts-/Rückwärtskompatibilität · versionierte Migration · Dry Run
- Backup mit ID + Zeitstempel und **verifiziertem** Restore-Weg
- Abgleich per Datensatzanzahl/Summen/Hashes
- Rollback-Plan · Prüfung aller Leser UND Schreiber · Prüfung laufender Jobs und älterer
  Anwendungsversionen
Achtung Bestandsrisiko: `drizzle-kit push --force` löscht Tabellen, die nicht im Schema
deklariert sind — vor jedem Schema-Sync prüfen, was er tun wird.

## Feature Flags
Risikoreiche Funktionen hinter Flag einführen. Jedes Flag hat: Owner · Standardzustand ·
Aktivierungsregel · Rollback-Weg · geplantes Entfernungsdatum (bei Einführung festgelegt).

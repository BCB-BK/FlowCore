# Regel: Release, Rollback, Nachbeobachtung (universell)

## Vor jeder kritischen PROD-Freigabe (Details: Skill `deploy`)
Vollständige Änderungsliste · Risikoanalyse · betroffene Systeme + Nutzergruppen ·
Deploy-Reihenfolge · Backup mit Restore-**Nachweis** · Rollback-Trigger + konkrete Schritte ·
Datenintegritätsprüfung · Smoke-Test · Health-Check · Beobachtungs-/Abnahmekriterien.

**Ein Rollback-Plan darf nicht nur „alten Commit deployen" lauten**, wenn DB-, Storage-,
Event- oder Vertragsänderungen betroffen sind — dann gehört die Daten-Rückabwicklung dazu.
Ist der Rollback-Weg nicht nachvollziehbar oder nicht durchführbar, geht die Änderung
**nicht** nach PROD.

## Nach dem Deployment
Reale Health-Checks, Logs, Metriken, Kernworkflows und relevante Datenzustände prüfen.
**Ein erfolgreich gestarteter Deploy-Prozess ist noch kein erfolgreiches Deployment.**
Beobachtungszeitraum und Abnahmekriterien vorab benennen; Ergebnis dokumentieren.

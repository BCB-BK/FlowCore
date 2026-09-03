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

## Bauort und Beobachtbarkeit (v2.13, 03.09.2026)

**Eine Maschine, die PROD ausliefert, baut nichts.** Images, Bundles und Abhängigkeiten
entstehen auf einem Runner oder einer Baumaschine und werden **fertig** übertragen; die
ausliefernde Maschine lädt und startet. Ein Bau neben der Live-Website konkurriert mit ihr um
Speicher und CPU — und verliert nicht, sondern **gewinnt**: Der Kernel verdrängt die Produktion,
um den Bau am Leben zu halten. *(Auslöser 03.09.2026, OneCampus: DEV-Image-Bau auf der
PROD-Maschine, 5 Stunden Thrashing, Netz tot bis zum manuellen Neustart, 9,5 Stunden Ausfall,
kein OOM-Kill. Kein Image entstanden.)* Das Deploy-Skript auf der Maschine **baut nicht nach**,
wenn das Image fehlt — es bricht ab und nennt den Schritt, in dem die Ursache liegt.

**Zugriffsprotokoll ist Pflicht.** Der Reverse-Proxy jeder öffentlichen Umgebung schreibt ein
Zugriffsprotokoll (Zeit, Pfad, Status, Dauer — keine personenbezogenen Daten über das technisch
Nötige hinaus). Ohne es lässt sich ein Ausfall nicht einmal nachträglich beziffern: Wer war
betroffen, ab wann, wie lange? *(Derselbe Vorfall: 11.098 Proxy-Logzeilen, keine einzige vom
Typ Zugriff.)*

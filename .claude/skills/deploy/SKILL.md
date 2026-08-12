---
name: deploy
description: DEV-/PROD-Deployment-Verfahren — Freigabe, Backup + Restore-Nachweis, Rollback-Plan, Smoke-Test, Nachbeobachtung. Anwenden bei jedem PROD-wirksamen Push/Merge und bei DEV-Deploys mit Daten- oder Schema-Wirkung.
---

# Deploy — Verfahren

## DEV (Tools mit DEV-Umgebung)
Push auf die DEV-Branch deployt automatisch (Webhook). Danach Pflicht: Health-Check real
abrufen, Deploy-Log lesen, bei Schema-Sync dessen Wirkung vorher kennen (drizzle-kit push
löscht undeklarierte Tabellen). Fehlschlag = sofort melden, nicht stapeln.

## PROD (Tier B/C: nur nach Freigabe · Tier A: mit denselben Nachweisen)
**Vor der Freigabe-Anfrage vorlegen:**
1. Vollständige Änderungsliste (Features, Fixes, Schema-/Datenwirkung, Nutzer-Sichtbares)
2. Risikoanalyse + betroffene Systeme/Nutzergruppen
3. Deploy-Reihenfolge (inkl. abhängiger Dienste/Jobs)
4. Backup: ID + Zeitstempel + **verifizierter** Restore-Weg (real getestet, nicht behauptet)
5. Rollback: Trigger (wann wird zurückgerollt?) + konkrete Schritte — bei DB-/Storage-/
   Event-/Vertragsänderungen inkl. Daten-Rückabwicklung; „alten Commit deployen" allein
   genügt dann nicht. Kein durchführbarer Rollback ⇒ kein PROD-Deploy.
6. Doku-Gate erfüllt (Kernvertrag §7.4)

**Nach dem Deploy — Pflicht, nicht optional:**
`bash .claude/guards/post-deploy-smoke.sh` muss **Exit 0** liefern (Konfiguration:
`.claude/smoke.conf` je Instanz — Basis-URL, Health-Pfad, 1–3 Kernpfade mit erwartetem
Status). Der Smoke-Verdikt-Block wird in der Abschlussmeldung zitiert. Schlägt er fehl, gilt
der Deploy als **nicht verifiziert** → Logs prüfen, ggf. Rollback (`rules/release-rollback.md`).
Zusätzlich: Logs/Metriken sichten, relevante Datenzustände stichprobenartig prüfen,
Beobachtungszeitraum benennen. Ein gestarteter Deploy-Prozess ist kein erfolgreiches Deployment.

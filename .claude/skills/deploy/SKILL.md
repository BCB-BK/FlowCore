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

## GO-Protokoll — Freigabe durch den Betreiber, Ausführung durch den Agenten (v2.14)

**Betreiber 08.09.2026:** Er gibt anhand einer Zusammenfassung frei; **der Agent führt das
Release selbst aus.** Kein Git, kein GitHub, kein Terminal für den Betreiber.

1. **Zusammenfassung** — eine Nachricht: Was ändert sich für Nutzer · was wurde technisch
   gemacht · welche Nachweise liefen (Exit-Codes, Stufe L) · Risiken · Rückweg.
2. **Freigabe** — der Betreiber antwortet mit genau **`GO www2`** oder **`GO prod`**. Jede
   andere Formulierung ist kein GO; dann nachfragen, nicht deuten.
3. **Ausführung durch den Agenten** nach dem Weg des Repos (steht in der Repo-`CLAUDE.md`):
   EHiP `deploy_stage.sh` / `stage_approve.sh` + Merge `main` + `deploy_prod.sh` · OneCampus
   Dispatch `deploy-prod.yml` mit Pflichteingabe (später `promote.sh`) · PLATO und Tools Merge
   bzw. Push auf den PROD-Branch. Die Maschine verweigert ohne Freigabemarke — das ist die
   stärkere Form derselben Regel, nicht eine andere.
4. **Meldung** — Smoke-Verdikt (unten) und die Bestätigung, welcher Stand auf welcher Stufe
   läuft. Neue Umgebung? Dann im selben Zug in `domains.conf` der Zentrale eintragen.

**Nach dem Deploy — Pflicht, nicht optional:**
`bash .claude/guards/post-deploy-smoke.sh` muss **Exit 0** liefern (Konfiguration:
`.claude/smoke.conf` je Instanz — Basis-URL, Health-Pfad, 1–3 Kernpfade mit erwartetem
Status). Der Smoke-Verdikt-Block wird in der Abschlussmeldung zitiert. Schlägt er fehl, gilt
der Deploy als **nicht verifiziert** → Logs prüfen, ggf. Rollback (`rules/release-rollback.md`).
Zusätzlich: Logs/Metriken sichten, relevante Datenzustände stichprobenartig prüfen,
Beobachtungszeitraum benennen. Ein gestarteter Deploy-Prozess ist kein erfolgreiches Deployment.

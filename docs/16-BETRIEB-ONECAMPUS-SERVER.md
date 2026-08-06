# FlowCore auf dem OneCampus-Server — Betrieb und Deploy

**Stand**: 06.08.2026 · Gilt ab dem Umzug von Replit auf den eigenen IONOS-Server.
Diese Notiz richtet sich an alle, die künftig an FlowCore arbeiten — Menschen wie Agenten.

---

## 1. Wo läuft was

| Umgebung | Adresse | Branch | Verzeichnis | Datenbank |
|---|---|---|---|---|
| **PROD** | https://flowcore.onecampusgroup.de | `master` | `/var/www/flowcore-prod` | `flowcore_prod` |
| **DEV** | https://dev-flowcore.onecampusgroup.de | `dev` | `/var/www/flowcore-dev` | `flowcore_dev` |

Beide laufen als Linux-Benutzer `flowcore` unter PM2 (fork-Modus, **eine** Instanz — FlowCore
fährt In-Process-Scheduler, im Cluster-Modus liefen die Jobs doppelt).

Die alte Adresse `flowcore.bildungscampus-backnang.de` ist stillgelegt.

## 2. Branch-Modell und Deploy

```
Push auf dev            ->  automatisches Ausrollen auf DEV
Merge  dev -> master    ->  automatisches Ausrollen auf PROD
```

Ein Push löst einen GitHub-Webhook aus, der auf dem Server `flowcore-deploy` startet.
Der Ablauf, in dieser Reihenfolge:

1. **Vorab-Sicherung** der Datenbank (`pg_dump` mit Prüfsumme)
2. `git merge --ff-only` — ein abweichender Arbeitsbaum wird **nicht** überfahren
3. `pnpm install --frozen-lockfile`
4. Bauen (siehe Fallstricke unten)
5. `pnpm --filter @workspace/db run push` — Schemaabgleich
6. Datenbank-Trigger anwenden
7. PM2-Neustart, danach bis zu 40 Sekunden Gesundheitsprüfung auf `/api/healthz`

**Schlägt ein Schritt fehl, rollt das Skript selbsttätig auf den vorherigen Commit zurück**,
baut neu und prüft erneut. Die Seite bleibt nie kaputt zurück. Ein `flock` verhindert, dass
zwei Ausrollvorgänge gleichzeitig laufen.

Von Hand — nützlich, wenn ohne Push ausgerollt werden soll:

```bash
sudo flowcore-deploy prod            # oder: dev
sudo flowcore-deploy dev --erzwingen # auch bauen, wenn kein neuer Commit da ist
```

Protokolle: `/var/log/flowcore-deploy.log` und `/var/log/flowcore-webhook.log`.

> **Falle beim Arbeiten direkt auf dem Server:** Wer im Server-Arbeitsbaum committet und von
> dort pusht, hat den Zielstand bereits lokal. Der Webhook kommt an, das Deploy-Skript sieht
> „kein neuer Commit" und **baut nicht**. Bei Doku-Änderungen ist das folgenlos, bei Code
> nicht. Danach also `sudo flowcore-deploy dev --erzwingen` nachschieben — oder besser: von
> der eigenen Arbeitsumgebung aus pushen, nicht vom Server.

## 3. Was der Agent darf — und was nicht (Tier B)

| | DEV | PROD |
|---|---|---|
| Direkt arbeiten und deployen | **ja** | nein |
| Weg auf PROD | — | **nur** über Pull Request nach `master` |

`master` ist durch ein GitHub-Ruleset geschützt: Direkte Pushes werden abgewiesen, auch mit
Schreibrechten. Ein Ausrollen auf PROD setzt einen zusammengeführten Pull Request voraus,
und **einen PR legt immer ein Mensch an** — der Deploy-Key kann das nicht.

Das ist kein Hindernis, sondern das Gate: Auf DEV darf frei gearbeitet werden, PROD ist an
eine menschliche Entscheidung gebunden.

## 4. Fallstricke, die Zeit kosten, wenn man sie nicht kennt

**Nicht `pnpm run build` im Wurzelverzeichnis.** Das baut alle 14 Workspace-Pakete, darunter
`mockup-sandbox` — ein reiner Vorschauserver, der ohne `BASE_PATH` abbricht. Produktion sind
genau zwei Pakete:

```bash
export NODE_ENV=production
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/wiki-frontend run build
```

`BASE_PATH` ist je Paket verschieden — `/` fürs Wiki-Frontend. Global gesetzt baut man das
Frontend mit falschem Basispfad.

**Der PM2-Startpfad ist `artifacts/api-server/dist/index.mjs`**, nicht `dist/index.mjs`.

**PM2 7.0.3 wertet die Datei-Option für Umgebungsvariablen nicht aus.** Deshalb liest
`/home/flowcore/env/ecosystem.config.cjs` die `.env` selbst ein. Wer das ändert, muss mit
`pm2 env <id>` gegenprüfen, dass die Werte im Prozess wirklich ankommen.

**`drizzle-kit` und das Trigger-Skript brauchen `DATABASE_URL` in der Umgebung.** Sie lesen
keine `.env`. Das Deploy-Skript lädt sie deshalb vorher.

**`scripts/post-merge.sh` ruft `npx tsx` auf — `tsx` ist im Workspace nicht installiert.**
Dieser Schritt schlägt dort still fehl. Node 24 führt TypeScript direkt aus:
`node lib/db/src/triggers/apply-triggers.ts`. *(Offener Punkt im Repo: entweder `tsx` als
Abhängigkeit aufnehmen oder das Skript umstellen.)*

## 5. Datensicherung

| Was | Wann | Wohin |
|---|---|---|
| Volle Sicherung beider Datenbanken | täglich 02:30 | `/var/backups/flowcore/postgres`, gestaffelt 7 täglich / 4 wöchentlich / 6 monatlich |
| Vorab-Sicherung | vor **jedem** Ausrollen | `/var/backups/flowcore/vor-deploy`, die letzten 10 je Datenbank |
| Wiederherstellungstest | sonntags 03:15 | spielt die jüngste Sicherung in eine Wegwerf-Datenbank und vergleicht |

`user_sessions` bleibt aus den Sicherungen ausgeschlossen (enthält Sitzungsdaten).
Übersicht: `sudo flowcore-backup --list`. Zustand des Systems: `sudo flowcore-check`.

Zusätzlich sichert die Anwendung selbst nach SharePoint (Ordner „Backups") — **auf PROD
eingeschaltet, auf DEV dauerhaft aus**, damit die Aufbewahrungsregel keine echten Sicherungen
wegrotiert.

## 6. Anmeldung

Entra ID (Microsoft). PROD und DEV teilen sich **eine** App-Registrierung mit zwei
Redirect-URIs — eine bewusste Betreiberentscheidung. **Folge:** Ein kompromittiertes
DEV-Secret ist zugleich das PROD-Secret; jede Rotation trifft beide Umgebungen gleichzeitig.

Der Zugang ist auf die Entra-Gruppe „BildungsCampus – Übergreifend" beschränkt. Wer neu
hinzukommt, erhält automatisch nur die Leserolle (`viewer`) — höhere Rollen vergibt ein
Administrator in FlowCore.

## 7. Bekannte offene Punkte (Stand 06.08.2026)

- **Elf Anhänge fehlen.** Verfahrensanweisungen vom 27.05.2026, hochgeladen vor der
  Umstellung auf SharePoint am 08.06.2026. Sie lagen nur im lokalen `.uploads`-Ordner des
  Replit-Containers, der nie gesichert wurde (`.gitignore`) und beim Container-Reset verloren
  ging. **Die Prozessseiten selbst sind vollständig** — nur die PDF-Anhänge müssen neu
  hochgeladen werden. Prüfung: `sudo flowcore-medien-check prod`.
- **E2E-Tests laufen nicht.** `e2e.yml` überspringt sich ohne `E2E_BASE_URL`; die Tests
  brauchen zudem eine Umgebung mit `AUTH_DEV_MODE=true`.
- **SharePoint-Sync** ist in beiden Umgebungen abgeschaltet.

---

*Diese Notiz gehört zum Umzugsprojekt (`BCB-BK/toolumzug`). Der vollständige Stand des
Servers steht dort im `server-register.md`, die Auditbefunde in `docs/06-folgeaudit-flowcore.md`.*

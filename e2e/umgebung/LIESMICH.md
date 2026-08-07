# E2E-Testumgebung

## Warum eine eigene Umgebung

Die E2E-Tests lassen sich weder gegen PROD noch gegen DEV fahren:

* Sie melden sich über den Kopfzeileneintrag `X-Dev-Principal-Id` an. Den
  akzeptiert nur `AUTH_DEV_MODE=true`. DEV auf diesen Modus umzustellen wäre
  keine Lösung — `dev-flowcore.onecampusgroup.de` ist öffentlich erreichbar und
  stünde damit ohne Anmeldung offen.
* Sie **schreiben** Daten. `POST /content/nodes` legt Seiten an, andere Tests
  veröffentlichen Fassungen und vergeben Rechte.

Deshalb dieses Skript: Es baut eine Wegwerf-Datenbank auf, startet einen
Server ausschließlich auf `127.0.0.1` und räumt beides hinterher weg.

## Aufruf

```bash
e2e/umgebung/testumgebung.sh auf     # aufbauen, Server bleibt stehen
e2e/umgebung/testumgebung.sh ab      # Server beenden, Datenbank löschen
e2e/umgebung/testumgebung.sh test    # auf + Testlauf + ab (Rückgabewert = Testergebnis)
```

Zusätzliche Parameter hinter `test` gehen an Playwright durch, etwa
`testumgebung.sh test tests/content.spec.ts --reporter=list`.

Fortschrittsmeldungen gehen auf die Fehlerausgabe, damit `--reporter=json` auf
der Standardausgabe unverfälscht bleibt.

## Zugang zur Datenbank

Eigene Rolle `flowcore_e2e` mit `CREATEDB`, **ohne** Superuser und ohne
Zugriff auf `flowcore_prod` oder `flowcore_dev` (beides geprüft). Sie legt nur
ihre eigene Datenbank an — deshalb braucht das Skript kein `sudo`. Das Passwort
steht in `/home/flowcore/env/.pw_e2e` (`chmod 600`), alternativ per
`E2E_DB_PASSWORD` setzbar.

## Testdatenbestand

`testdaten.sql` legt die fünf Personen an, deren Kennungen die Testdateien fest
voraussetzen (`ADMIN_ID`, `EDITOR_ID`, `VIEWER_ID`, `REVIEWER_ID`, `PM_ID`).
Ohne sie antwortet **jeder** Aufruf mit `Principal not found` — der allgemeine
Seed in `lib/db` legt keine Personen an. Das war der Grund, weshalb die Suite
nie lief.

## Stand der Suite (07.08.2026)

| | |
|---|---|
| bestanden | 67 |
| fehlgeschlagen | 44 |
| übersprungen | 57 |

Die 57 übersprungenen betreffen Graph-Connector und Copilot; sie überspringen
sich selbst, solange die zugehörige Anbindung nicht konfiguriert ist. Das ist
richtiges Verhalten für eine lokale Umgebung.

**Die 44 Fehlschläge sind sämtlich Erwartungsabweichungen, kein Absturz und
kein Serverfehler.** Stichproben zeigen durchweg veraltete Tests, nicht defekte
Anwendung:

* `POST /content/nodes/:id/revisions` erwartet 201, bekommt 409 — der Endpunkt
  wurde bewusst abgeschaltet, Fassungen entstehen nur noch über den
  Arbeitskopie-Ablauf.
* `GET /auth/dev-users` erwartet 200, bekommt 404 — den Endpunkt gibt es im
  heutigen Code nicht mehr.
* `GET /api/healthz` erwartet das Feld `database`, geliefert wird `db`.

**Diese 44 sind nicht blind zu reparieren.** Bei jedem Einzelfall ist zu
entscheiden, ob die Erwartung oder das Verhalten falsch ist. Wer die Tests
einfach an das heutige Verhalten anpasst, schreibt Fehler fest, statt sie zu
finden. Das gehört Endpunkt für Endpunkt durchgegangen.

## Was für die CI noch fehlt

Der Ablauf in `.github/workflows` müsste dieses Skript aufrufen und das
Passwort als Repository-Secret hinterlegt bekommen. Ein `E2E_BASE_URL` auf eine
dauerhaft laufende Testinstanz ist damit **nicht** mehr nötig — die Umgebung
entsteht im Lauf und verschwindet danach wieder.

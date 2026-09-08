# Regel: Nichtfunktionale Qualität & Betriebsfähigkeit (universell)

Funktionale Korrektheit allein reicht nicht. Je nach Art und Risiko der Änderung prüfen:
Performance/Ressourcen · Barrierefreiheit · Responsive-Verhalten · Browser/Geräte ·
Fehler-/Lade-/Leerzustände · Rückwärtskompatibilität · Idempotenz · Parallelität/Races ·
Timeouts/Retries · Rate Limits · Caching + Invalidierung · Lokalisierung/Zeitzonen ·
Recovery · Betrieb ohne unnötige Handgriffe.

**Nicht alles bei jedem Task** — aber immer begründen: Welche Dimensionen sind relevant,
welche wurden geprüft, warum sind die übrigen hier nicht nötig? Diese Begründung gehört in
den Abschluss.

## Browser-Nachweis: ein Werkzeug, drei Stufen (v2.14)

**Echte Browser-Tests sind die Prüfgrundlage für Frontend-Änderungen** (Betreiber 08.09.2026) —
Playwright gegen die DEV-Adresse, ausgeführt von der DEV-Maschine, ohne Installation auf dem
Host (Playwright-Docker-Image, Vorbild `EHiP-Website/tests/browser/`). Der Nachweis besteht aus
Spec-Name, Laufausgabe mit Exit-Code und Screenshots und steht im Abschluss und im Bericht.
Die Stufe legt die Auftragskarte fest (Skill `auftrag`):

| Stufe | Was geändert wurde | Nachweis | Dauer |
|---|---|---|---|
| **S** | Text, Farbe, Abstand, Button verschoben | Screenshot der betroffenen Seite bei 390 px und 1280 px; Konsolen-/Netzfehler-Sweep dieser Seite | ~1 Min. |
| **M** | Neue oder geänderte Funktion (Formular, Filter, Kalender, Abfrage) | Ablauf-Spec, der die Funktion auf DEV **durchführt** (bis Bestätigung / Datensatz), bei drei Breiten; Barrierefreiheits-Schnellprüfung; der Spec bleibt im Repo | 5–15 Min. |
| **L** | Navigation, Anmeldung, Zahlung, Release nach PROD | Vollsuite des Repos + `post-deploy-smoke.sh` nach dem Deploy | nach Repo |

Keine Stufe erzwingt eine eigene Wächter-Runde. Ein verschobener Button ist S und fertig,
wenn der Screenshot ihn zeigt. E2E-Vollsuiten bei jeder Änderung wären zu langsam und würden
bald übersprungen — das ist schlimmer als kein Test. Specs, die Daten schreiben, laufen
**nie** gegen PROD; steht im Repo etwas Strengeres, gilt das.

## Observability
Neue kritische Abläufe müssen beobachtbar sein: strukturierte Logs, Metriken, Korrelations-IDs,
Health-Checks, Alarmierung — soweit relevant. Observability erfasst keine Secrets und keine
unnötigen personenbezogenen Daten. Ein Verhalten, dessen Zustand im Betrieb nicht beobachtet
oder belastbar verifiziert werden kann, gilt nicht als nachgewiesen.

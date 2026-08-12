# Regel: Nichtfunktionale Qualität & Betriebsfähigkeit (universell)

Funktionale Korrektheit allein reicht nicht. Je nach Art und Risiko der Änderung prüfen:
Performance/Ressourcen · Barrierefreiheit · Responsive-Verhalten · Browser/Geräte ·
Fehler-/Lade-/Leerzustände · Rückwärtskompatibilität · Idempotenz · Parallelität/Races ·
Timeouts/Retries · Rate Limits · Caching + Invalidierung · Lokalisierung/Zeitzonen ·
Recovery · Betrieb ohne unnötige Handgriffe.

**Nicht alles bei jedem Task** — aber immer begründen: Welche Dimensionen sind relevant,
welche wurden geprüft, warum sind die übrigen hier nicht nötig? Diese Begründung gehört in
den Abschluss.

## End-to-End-Tests: risikobasiert, nicht pauschal

E2E-Vollsuiten bei jeder Änderung wären zu langsam und würden bald übersprungen — das ist
schlimmer als kein Test. Drei Einsatzpunkte, mehr nicht:

| Anlass | Umfang |
|---|---|
| UI-/Flow-Änderung | nur die betroffenen Specs, lokal |
| vor PROD-Übernahme (Tier B/C) | Vollsuite gegen DEV/Testumgebung, als Gate |
| nach jedem Deploy | `post-deploy-smoke.sh` (< 1 Minute), Pflicht |

E2E-Tests, die Daten schreiben, laufen **nie** gegen PROD und nur gegen eine dafür
vorgesehene Umgebung — steht im Repo etwas anderes, gilt die strengere Angabe.

## Observability
Neue kritische Abläufe müssen beobachtbar sein: strukturierte Logs, Metriken, Korrelations-IDs,
Health-Checks, Alarmierung — soweit relevant. Observability erfasst keine Secrets und keine
unnötigen personenbezogenen Daten. Ein Verhalten, dessen Zustand im Betrieb nicht beobachtet
oder belastbar verifiziert werden kann, gilt nicht als nachgewiesen.

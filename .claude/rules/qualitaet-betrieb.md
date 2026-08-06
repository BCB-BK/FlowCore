# Regel: Nichtfunktionale Qualität & Betriebsfähigkeit (universell)

Funktionale Korrektheit allein reicht nicht. Je nach Art und Risiko der Änderung prüfen:
Performance/Ressourcen · Barrierefreiheit · Responsive-Verhalten · Browser/Geräte ·
Fehler-/Lade-/Leerzustände · Rückwärtskompatibilität · Idempotenz · Parallelität/Races ·
Timeouts/Retries · Rate Limits · Caching + Invalidierung · Lokalisierung/Zeitzonen ·
Recovery · Betrieb ohne unnötige Handgriffe.

**Nicht alles bei jedem Task** — aber immer begründen: Welche Dimensionen sind relevant,
welche wurden geprüft, warum sind die übrigen hier nicht nötig? Diese Begründung gehört in
den Abschluss.

## Observability
Neue kritische Abläufe müssen beobachtbar sein: strukturierte Logs, Metriken, Korrelations-IDs,
Health-Checks, Alarmierung — soweit relevant. Observability erfasst keine Secrets und keine
unnötigen personenbezogenen Daten. Ein Verhalten, dessen Zustand im Betrieb nicht beobachtet
oder belastbar verifiziert werden kann, gilt nicht als nachgewiesen.

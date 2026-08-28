---
name: critical-task
description: Pflicht-Verfahren für Standard- und kritische Aufträge — Definition of Ready, Systemkarte/Wirkungskette, Root-Cause-Arbeit, Live-Validierung, Entscheidungsvorlagen. Anwenden, bevor bei einem als standard/kritisch eingestuften Auftrag Code angefasst wird.
---

# Kritischer Task — Verfahren

## 1. Einstufung
- **klein:** lokal, ein Bereich, reversibel, kein Daten-/Sicherheitsbezug → ohne dieses Verfahren, DoD gilt trotzdem.
- **standard:** mehrere Dateien/Komponenten ODER Verhalten für Nutzer ändert sich.
- **kritisch:** Schema/Daten, Auth/AuthZ, Geld, personenbezogene Daten, externe Verträge, PROD-Wirkung, schwer reversibel.

## 2. Definition of Ready (vor dem ersten Edit dokumentieren)
Zielzustand · Nicht-Ziele · fachliche Akzeptanzkriterien · betroffene Umgebung (deklariert,
nicht angenommen) · reales Testobjekt oder zulässiger Contract-Nachweis · betroffene
Komponenten + Schnittstellen · Risiken · Rollback-/Rückabwicklungsweg · notwendige Entscheidungen.

**Gedächtnis-Check (Kernvertrag §2, drei Zeilen genügen):** `ocg-architekt` → `START.md` +
`docs/uebersichten/THEMENINDEX.md` + einschlägige Dossiers gelesen; betroffene Nachbar-Repos
lesend angebunden. Dokumentieren: *Geprüft:* … · *Übernommen:* … (mit Quelle) · *Bewusst
anders:* … (mit Begründung — ohne ausgewiesene Betreiber-Freigabe blockiert eine Abweichung
die Wächter-Freigabe).

Fehlt davon etwas: **erst Repo/Doku/Historie/Muster untersuchen.** Rückfrage nur bei
geschäftlicher Zielentscheidung, irreversibler Wirkung, nicht auflösbarem Widerspruch oder
fehlender externer Voraussetzung.

## 3. Wirkungskette kartieren (Systemkarte)
Vor der Umsetzung identifizieren und in der Antwort zeigen:
auslösende Oberfläche/Quelle → API-/Service-/Backend-Pfade → DB/Storage/Persistenz →
Queues/Jobs/Events/Trigger → erzeugende und konsumierende Komponenten → Validierungen +
Business Rules → Berechtigungen/Mandanten → Frontend/Export/Audit/Reporting →
Monitoring/Fehlerbehandlung → betroffene Doku + externe Integrationen.
SSOT je Repo: `docs/00-SYSTEMKARTE.md` (+ `01-ARCHITEKTUR.md`, `02-UMGEBUNGEN-UND-DEPLOYMENT.md`,
`03-DATENVERTRAEGE.md`, `04-BETRIEB-UND-MONITORING.md`, `adr/`). Weicht Doku vom realen
Code-/Laufzeitstand ab: Konflikt benennen, per Nachweis auflösen, Doku im selben Task korrigieren.

## 4. Umsetzung
Root-Cause-first (Kernvertrag §3.2), Pre-Action-Audit als Tabelle (§3.6), Baseline nach
`rules/git-sicherheit.md`, Umgebema nach `rules/umgebungen-migrationen.md`.

## 5. Live-Validierung
Akzeptanzkriterien real durchspielen (echte Kette, echte Daten, Zielumgebung oder deren
nachgestellte Parität). Jeden Nachweis zitierbar machen (Log-Zeile, Query-Ergebnis,
Test-Report mit Exit-Code). Nicht Nachweisbares explizit als offen ausweisen.

## 6. Entscheidungsvorlage (wenn eine Betreiber-Entscheidung nötig ist)
Was wird entschieden? · Warum nötig? · **Meine Empfehlung** · höchstens zwei echte
Alternativen · Auswirkungen (Betrieb, Kosten, Sicherheit, Zukunftsfähigkeit) ·
reversibel ja/nein · Folgeentscheidungen. Keine technische Rückdelegation.

## 7. Abschluss
DoD des Kernvertrags §7 vollständig, Review nach §8 (bei kritisch: security-reviewer Pflicht),
Status aus der Vierer-Ontologie.

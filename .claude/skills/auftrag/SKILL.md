---
name: auftrag
description: Auftragskarte vor jeder Aufgabe (v2.14) — Gedächtnis-Fragen, drei bis sieben prüfbare Kriterien, Stufe S/M/L des Browser-Nachweises. Sie ist der Maßstab, an dem der Wächter am Ende misst. Für kritische Aufträge zusätzlich Skill `critical-task`.
---

# Auftragskarte — der Maßstab, bevor die erste Zeile entsteht

**Warum (Betreiber, 08.09.2026):** Agenten prüften am Ende gegen ihren Geschmack, nicht gegen
den Auftrag; Reviewer fanden immer etwas; Aufgaben kreisten. Und niemand fragte zuerst, was
das Haus zu diesem Thema schon gebaut hat. Die Karte beantwortet beides, **vor** dem Bau.

## Die Karte (in der Antwort an den Betreiber, dann im Commit-Text)

```
AUFTRAGSKARTE
Auftrag (wörtlich): …
Gedächtnis: Dossier <name> gelesen (ocg-architekt/docs/uebersichten/) — übernommen: … · bewusst anders: …
            | kein Dossier zu diesem Thema — THEMENINDEX und Nachbar-Repos geprüft: <was gefunden / nichts>
Kriterien (prüfbar, je eine Zeile):
  K1 …
  K2 …
  K3 …
Stufe: S | M | L   (Browser-Nachweis nach rules/qualitaet-betrieb.md)
Betroffen: <Seiten/Pfade/Dienste>
Einstufung: klein | standard | kritisch   (kritisch → zusätzlich Skill critical-task)
```

## Die vier Gedächtnis-Fragen — immer zuerst

1. **Was wurde zu diesem Thema schon gebaut?** (in welchem Repo, welche Dateien)
2. **Welche Ansätze gab es?**
3. **Was hat funktioniert?**
4. **Was hat nicht funktioniert — und warum?**

Quelle: `docs/uebersichten/THEMENINDEX.md` der Zentrale und das Dossier des Themas. Gibt es
keins, werden die Nachbar-Repos lesend angebunden (`rules/technik-gedaechtnis.md`). Die
Antwort steht in der Zeile „Gedächtnis“ — auch wenn sie „nichts gefunden“ lautet. **Am Ende
der Aufgabe werden fünf Zeilen ins Dossier zurückgeschrieben** (Verlauf: was neu ist, was
scheiterte). Fehlt das Dossier und betrifft das Thema mehr als ein Repo, wird es angelegt.

## Kriterien — was ein prüfbares Kriterium ist

Ein Kriterium nennt **Ort, Verhalten und Nachweis**: „Button ‚Termin buchen‘ steht auf
`/kontakt` über dem Formular, bei 390 px und 1280 px sichtbar, führt zur Terminwahl.“
Nicht: „Terminbuchung verbessern“. Drei bis sieben; mehr heißt, der Auftrag ist zwei Aufträge.

## Stufe des Browser-Nachweises

| Stufe | Änderung | Nachweis (Details `rules/qualitaet-betrieb.md`) |
|---|---|---|
| **S** | Text, Farbe, Abstand, Button verschoben | Screenshot der Seite bei 390 px und 1280 px, Konsolen-/Netzfehler-Sweep dieser Seite |
| **M** | neue oder geänderte Funktion | Ablauf-Spec auf DEV bis zur Bestätigung, drei Breiten, Barrierefreiheits-Schnellprüfung; Spec bleibt im Repo |
| **L** | Navigation, Anmeldung, Zahlung, Release nach PROD | Vollsuite + Smoke nach Deploy |

## Was die Karte nicht ist

Kein Manifest, kein Artefakt, keine Datei je Aufgabe. Sie steht in der Antwort und im
Commit-Text — und der Wächter bekommt sie als ersten Teil seines Übergabepakets.

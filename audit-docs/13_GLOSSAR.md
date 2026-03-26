# 13 — Glossar-System

## 13.1 Übersicht

FlowCore enthält ein zentrales Glossar-System zur Verwaltung von Fachbegriffen, Abkürzungen und Definitionen. Glossarbegriffe können optional mit Wiki-Seiten verknüpft werden.

## 13.2 Funktionen

- **Begriffsverwaltung:** Erstellen, Bearbeiten und Löschen von Glossarbegriffen
- **Rich-Text-Definitionen:** Definitionen werden als HTML gespeichert (Tiptap SimpleEditor)
- **Synonyme:** Mehrere Synonyme pro Begriff
- **Wiki-Verknüpfung:** Begriffe können mit Wiki-Seiten verknüpft werden
- **Alphabetische Filterung:** Filterung nach Anfangsbuchstabe
- **Volltextsuche:** Suche über Begriffe und Definitionen

## 13.3 Datenmodell

```
glossary_terms
├── id (uuid, PK)
├── term (text, NOT NULL)          → Der Fachbegriff
├── slug (text, UNIQUE, NOT NULL)  → URL-freundlicher Bezeichner
├── definition (text)              → Definition als HTML
├── synonyms (text[])              → Array von Synonymen
├── node_id (uuid, FK)             → Optionale Verknüpfung mit Wiki-Seite
├── created_by (text)              → Ersteller
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

## 13.4 API-Endpunkte

| Methode | Pfad | Zweck |
|:--------|:-----|:------|
| GET | `/api/glossary/` | Begriffe filtern (Query-Parameter: `q`, `letter`) |
| POST | `/api/glossary/` | Begriff erstellen |
| GET | `/api/glossary/:id` | Begriff-Details |
| PATCH | `/api/glossary/:id` | Begriff aktualisieren |
| DELETE | `/api/glossary/:id` | Begriff löschen |
| POST | `/api/glossary/:id/link` | Mit Wiki-Knoten verknüpfen |
| POST | `/api/glossary/:id/unlink` | Verknüpfung lösen |
| GET | `/api/glossary/by-node/:nodeId` | Begriffe eines Knotens |

## 13.5 Frontend-Komponenten

### GlossaryPage

- Alphabetisches Register (A-Z) zur schnellen Navigation
- Suchfeld für Begriffssuche
- Erstellen/Bearbeiten-Dialog mit:
  - Begriffsname
  - Rich-Text-Editor (SimpleEditor) für Definitionen
  - Synonym-Verwaltung
  - Wiki-Seitenverknüpfung

### SimpleEditor

Leichtgewichtiger Tiptap-Editor speziell für Glossar-Definitionen:
- Fettschrift, Kursiv, Unterstreichen
- Aufzählungen (nummeriert und unnummeriert)
- Links
- Bilder und Videos
- Saubere HTML-Ausgabe

## 13.6 Berechtigungen

| Aktion | Berechtigung |
|:-------|:-------------|
| Begriffe lesen | `read_page` |
| Begriffe erstellen/bearbeiten/löschen | `edit_content` |
| Glossar-Seite anzeigen | `view_glossary` |

## 13.7 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/routes/glossary.ts` | Glossar-Endpunkte |
| `lib/db/src/schema/glossary.ts` | DB-Schema |
| `artifacts/wiki-frontend/src/pages/GlossaryPage.tsx` | Glossar-UI |
| `artifacts/wiki-frontend/src/components/editor/SimpleEditor.tsx` | Rich-Text-Editor für Definitionen |

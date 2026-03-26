# 09 — KI-Integration

## 9.1 Übersicht

FlowCore integriert einen KI-gestützten Wissensassistenten basierend auf einer **Retrieval-Augmented Generation (RAG)** Architektur. Die KI unterstützt:

1. **Globaler Assistent:** Fragenantworten basierend auf Wiki-Inhalten
2. **Seitenassistent:** Schreibunterstützung bei der Inhaltserstellung
3. **RAG-Pipeline:** Kontextanreicherung durch Quellensuche
4. **Nutzungsanalyse:** Tracking und Statistiken
5. **Qualitäts- und Änderungslogik:** Qualitätsprüfung, Dublettenerkennung, Änderungszusammenfassungen

## 9.2 Globaler Assistent (AI Ask)

### Funktionalität

- Beantwortet Fragen in natürlicher Sprache zum gespeicherten Wissen
- Antworten werden in **Echtzeit per Server-Sent Events (SSE)** gestreamt
- Liefert anklickbare Quellenreferenzen (Wiki-Seiten, Konnektoren, Web)
- Zeigt Konfidenzniveau (Hoch, Mittel, Niedrig) basierend auf gefundenen Quellen
- **Published-first-Logik:** Standardmäßig nur veröffentlichte Inhalte als Kontext
- **Quellenkennzeichnung:** Jede Quelle trägt Typ-Label (Wiki, Connector, Web) und ggf. Status-Label

### Endpunkt

```
POST /api/ai/ask
Content-Type: application/json
Accept: text/event-stream

{
  "query": "Wie funktioniert der Onboarding-Prozess?",
  "includeUnpublished": false
}
```

### Antwort-Stream

```
data: {"type":"sources","sources":[{"nodeId":"...","title":"...","sourceType":"wiki","contentStatus":"published"}]}
data: {"type":"content","content":"Der Onboarding-Prozess..."}
data: {"type":"done","confidence":"high","sourcesCount":3,"webSearchUsed":false}
```

## 9.3 Seitenassistent (Page Assist)

### Aktionen

| Aktion | Beschreibung | Kategorie |
|:-------|:-------------|:----------|
| **Umformulieren** | Text neu formulieren bei gleichem Inhalt | Schreibhilfe |
| **Zusammenfassen** | Kernaussagen extrahieren | Schreibhilfe |
| **Erweitern** | Text inhaltlich ausbauen | Schreibhilfe |
| **Kürzen** | Text auf Wesentliches reduzieren | Schreibhilfe |
| **Professionalisieren** | Sprachstil verbessern | Schreibhilfe |
| **Tonalität anpassen** | Formell/informell umschreiben | Schreibhilfe |
| **Umstrukturieren** | Logische Neuordnung | Schreibhilfe |
| **Grammatikprüfung** | Rechtschreib- und Grammatikkorrektur | Schreibhilfe |
| **Lückenanalyse** | Fehlende Informationen identifizieren | Qualität |
| **Template-Vollständigkeit** | Prüfung ob Template-Felder ausgefüllt sind | Qualität |
| **Qualitätsprüfung** | Widersprüche, veraltete Infos erkennen | Qualität |
| **Dubletten prüfen** | Redundante Informationen identifizieren | Qualität |
| **Änderungszusammenfassung** | Änderungen sachlich zusammenfassen | Änderungslogik |

### Endpunkt

```
POST /api/ai/page-assist
Content-Type: application/json
Accept: text/event-stream

{
  "action": "quality_check",
  "text": "...",
  "nodeId": "..."
}
```

## 9.4 RAG-Pipeline (Retrieval-Augmented Generation)

### Ablauf

```
Frage → Rollenermittlung → Quellensuche → Published-Filter → Kontext-Aufbereitung → LLM-Aufruf → Streaming-Antwort
```

### Quellensuche

#### 1. Wiki-Suche

- Nutzt PostgreSQL-Volltextsuche (`to_tsquery` auf `searchVector`)
- **Deutsche Sprachunterstützung** für Stemming
- **RBAC-Prüfung:** Nur Inhalte, auf die der Benutzer Zugriff hat
- **Published-first:** Standardmäßig nur `status = 'published'`; optional erweiterbar für berechtigte Rollen
- Ergebnisse werden als strukturierte Snippets aufbereitet

#### 2. Konnektor-Suche

- Durchsucht externe Inhalte, die über Konnektoren synchronisiert wurden (z.B. SharePoint)
- Matching über Titel und Metadaten

#### 3. Web-Suche (optional)

- Wenn aktiviert: `web_search_preview` Tool innerhalb des OpenAI-Modells
- Für Echtzeitinformationen außerhalb des Wiki-Bestands

### Kontext-Aufbereitung

Gefundene Snippets werden als strukturierter Block mit Quelltyp und Status an das Modell übergeben:

```
[Quelle 1 – Wiki] PROC-001 – Onboarding-Prozess (process_page_text)
Der Onboarding-Prozess umfasst folgende Schritte...

[Quelle 2 – Connector: SharePoint] HR-001 – HR-Handbuch (system_documentation)
Neue Mitarbeiter erhalten am ersten Tag...

[Quelle 3 – Wiki [Status: draft]] PROC-042 – Entwurf (process_page_text)
Dieser Prozess ist noch in Bearbeitung...
```

### Quellenkennzeichnung

Jede AI-Quelle enthält folgende Metadaten:

| Feld | Beschreibung |
|:-----|:-------------|
| `sourceType` | `wiki`, `connector` oder `web` |
| `contentStatus` | Status des Inhalts (z.B. `published`, `draft`, `in_review`) |
| `sourceSystemName` | Name des externen Systems (bei Konnektoren) |
| `externalUrl` | Externe URL (bei Konnektoren) |

## 9.5 Rollen- und Zustandsbewusstsein

### Rollenkontext

Der KI-Prompt wird mit dem Rollenkontext des Benutzers angereichert:

- **Viewer:** Sieht nur veröffentlichte Inhalte; keine Warnungen zu Entwürfen
- **Editor/Reviewer/Approver/Process Manager:** Kann optional Entwürfe einbeziehen; erhält Warnungen zu nicht-freigegebenen Inhalten
- **System Admin:** Vollständiger Zugriff auf alle Inhalte

### Zustandsbewusstsein

Die KI-Prompts enthalten automatische Qualitätshinweise:

- Warnung bei Quellen im Status `draft` oder `in_review`
- Hinweis, wenn nur veröffentlichte oder auch nicht-freigegebene Quellen verwendet werden
- Aufforderung, Widersprüche zwischen Quellen zu kennzeichnen
- Hinweis auf möglicherweise fehlende Informationen

## 9.6 System-Prompt & Richtlinien

### Standard-System-Prompt

Der System-Prompt definiert:

- **Persona:** "FlowCore-Assistent der Wissensplattform des Bildungscampus Backnang"
- **Tonalität:** Professionell, Du-Ansprache
- **Fragetypen-Handler:**
  - Faktenfragen → Präzise, quellenbasierte Antworten
  - Prozessfragen → Schrittweise Erklärungen
  - Vergleichsfragen → Strukturierte Gegenüberstellung
  - Problemlösungsfragen → Lösungsvorschläge mit Begründung
  - Explorative Fragen → Umfassende Übersicht

### Dynamische Richtlinien

Basierend auf Admin-Einstellungen werden zusätzliche Anweisungen injiziert:

| Richtlinie | Optionen |
|:------------|:---------|
| **Quellenpriorität** | Wiki bevorzugt / Ausgewogen / Konnektor bevorzugt |
| **Antwortsprache** | Auto (Erkennung), Deutsch, Englisch |
| **Zitierstil** | Inline [1], Fußnoten, Keine |
| **Max. Quellen pro Antwort** | Konfigurierbar (Standard: 12) |

## 9.7 Modelle

| Modell | Bezeichnung | Eigenschaft |
|:-------|:------------|:------------|
| GPT-5.2 | Standard (Empfohlen) | Beste Qualität |
| GPT-5 Mini | Schneller | Gutes Gleichgewicht |
| GPT-5 Nano | Schnellster | Für einfache Anfragen |

## 9.8 Einstellungen

Konfigurierbar über `GET/PUT /api/ai/settings`:

| Einstellung | Beschreibung | Standard |
|:------------|:-------------|:---------|
| `enabled` | KI aktiviert/deaktiviert | `true` |
| `model` | Modellauswahl | `gpt-5.2` |
| `sourceMode` | Quellenumfang | `wiki_only` |
| `webSearchEnabled` | Websuche | `false` |
| `maxCompletionTokens` | Max. Antwortlänge | `8192` |
| `systemPrompt` | Benutzerdefinierter Prompt | Standard-Prompt |
| `promptPolicies.responseLang` | Antwortsprache | `auto` |
| `promptPolicies.citationStyle` | Zitierstil | `inline` |
| `promptPolicies.sourcePriority` | Quellenpriorität | Wiki zuerst |
| `promptPolicies.maxSourcesPerAnswer` | Max. Quellen | `12` |

## 9.9 Nutzungsanalyse

- **Endpunkt:** `GET /api/ai/usage-stats`
- **Metriken:**
  - Gesamtanzahl Anfragen
  - Fehlerrate
  - Null-Ergebnis-Anfragen
  - Durchschnittliche Latenz
  - Token-Verbrauch

**Gespeichert in:** `ai_usage_logs`-Tabelle mit Feldern für Benutzer, Anfrage, Modell, Tokens, Latenz und Fehler.

## 9.10 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/ai.service.ts` | Kernlogik: RAG, Streaming, Prompt-Aufbau, Qualitätslogik |
| `artifacts/api-server/src/routes/ai.ts` | AI-Endpunkte |
| `artifacts/wiki-frontend/src/components/ai/GlobalAssistant.tsx` | Globaler Assistent UI |
| `artifacts/wiki-frontend/src/components/ai/PageAssistant.tsx` | Seitenassistent UI (inkl. Qualitäts-/Änderungsaktionen) |
| `artifacts/wiki-frontend/src/components/settings/AISettingsTab.tsx` | KI-Einstellungen UI |
| `lib/db/src/schema/ai-settings.ts` | DB-Schema für KI-Einstellungen und Logs |
| `artifacts/api-server/src/services/rbac.service.ts` | Rollenlogik für Suchsichtbarkeit |

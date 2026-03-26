# 09 — KI-Integration

## 9.1 Übersicht

FlowCore integriert einen KI-gestützten Wissensassistenten basierend auf einer **Retrieval-Augmented Generation (RAG)** Architektur. Die KI unterstützt:

1. **Globaler Assistent:** Fragenantworten basierend auf Wiki-Inhalten
2. **Seitenassistent:** Schreibunterstützung bei der Inhaltserstellung
3. **RAG-Pipeline:** Kontextanreicherung durch Quellensuche
4. **Nutzungsanalyse:** Tracking und Statistiken

## 9.2 Globaler Assistent (AI Ask)

### Funktionalität

- Beantwortet Fragen in natürlicher Sprache zum gespeicherten Wissen
- Antworten werden in **Echtzeit per Server-Sent Events (SSE)** gestreamt
- Liefert anklickbare Quellenreferenzen (Wiki-Seiten, Konnektoren, Web)
- Zeigt Konfidenzniveau (Hoch, Mittel, Niedrig) basierend auf gefundenen Quellen

### Endpunkt

```
POST /api/ai/ask
Content-Type: application/json
Accept: text/event-stream

{ "question": "Wie funktioniert der Onboarding-Prozess?" }
```

### Antwort-Stream

```
data: {"type":"source","data":{"title":"Onboarding","nodeId":"...","type":"wiki"}}
data: {"type":"chunk","data":{"text":"Der Onboarding-Prozess..."}}
data: {"type":"confidence","data":{"level":"high","sourceCount":3}}
data: {"type":"done"}
```

## 9.3 Seitenassistent (Page Assist)

### Aktionen

| Aktion | Beschreibung |
|:-------|:-------------|
| **Umformulieren** | Text neu formulieren bei gleichem Inhalt |
| **Zusammenfassen** | Kernaussagen extrahieren |
| **Erweitern** | Text inhaltlich ausbauen |
| **Kürzen** | Text auf Wesentliches reduzieren |
| **Professionalisieren** | Sprachstil verbessern |
| **Tonalität anpassen** | Formell/informell umschreiben |
| **Umstrukturieren** | Logische Neuordnung |
| **Grammatikprüfung** | Rechtschreib- und Grammatikkorrektur |
| **Lückenanalyse** | Fehlende Informationen identifizieren |
| **Template-Vollständigkeit** | Prüfung ob Template-Felder ausgefüllt sind |

### Endpunkt

```
POST /api/ai/page-assist
Content-Type: application/json
Accept: text/event-stream

{
  "action": "professionalize",
  "text": "...",
  "nodeId": "...",
  "templateType": "policy"
}
```

## 9.4 RAG-Pipeline (Retrieval-Augmented Generation)

### Ablauf

```
Frage → Quellensuche → Kontext-Aufbereitung → LLM-Aufruf → Streaming-Antwort
```

### Quellensuche

#### 1. Wiki-Suche

- Nutzt PostgreSQL-Volltextsuche (`to_tsquery` auf `searchVector`)
- **Deutsche Sprachunterstützung** für Stemming
- **RBAC-Prüfung:** Nur Inhalte, auf die der Benutzer Zugriff hat
- Ergebnisse werden als strukturierte Snippets aufbereitet

#### 2. Konnektor-Suche

- Durchsucht externe Inhalte, die über Konnektoren synchronisiert wurden (z.B. SharePoint)
- Matching über Titel und Metadaten

#### 3. Web-Suche (optional)

- Wenn aktiviert: `web_search_preview` Tool innerhalb des OpenAI-Modells
- Für Echtzeitinformationen außerhalb des Wiki-Bestands

### Kontext-Aufbereitung

Gefundene Snippets werden als strukturierter Block an das Modell übergeben:

```
[WIKI-QUELLE] Titel: Onboarding-Prozess | ID: PROC-001
Inhalt: Der Onboarding-Prozess umfasst folgende Schritte...

[KONNEKTOR-QUELLE] Titel: HR-Handbuch | System: SharePoint
Inhalt: Neue Mitarbeiter erhalten am ersten Tag...
```

## 9.5 System-Prompt & Richtlinien

### Standard-System-Prompt

Der System-Prompt definiert:

- **Persona:** "Wissensassistent von FlowCore"
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
| **Quellenpriorität** | Wiki bevorzugt / Ausgewogen |
| **Antwortsprache** | Auto (Erkennung), Deutsch, Englisch |
| **Zitierstil** | Inline [1], Fußnoten, Keine |
| **Max. Quellen pro Antwort** | Konfigurierbar (Standard: 5) |

## 9.6 Modelle

| Modell | Bezeichnung | Eigenschaft |
|:-------|:------------|:------------|
| GPT-5.2 | Standard (Empfohlen) | Beste Qualität |
| GPT-5 Mini | Schneller | Gutes Gleichgewicht |
| GPT-5 Nano | Schnellster | Für einfache Anfragen |

## 9.7 Einstellungen

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
| `promptPolicies.maxSourcesPerAnswer` | Max. Quellen | `5` |

## 9.8 Nutzungsanalyse

- **Endpunkt:** `GET /api/ai/usage-stats`
- **Metriken:**
  - Gesamtanzahl Anfragen
  - Fehlerrate
  - Null-Ergebnis-Anfragen
  - Durchschnittliche Latenz
  - Token-Verbrauch

**Gespeichert in:** `ai_usage_logs`-Tabelle mit Feldern für Benutzer, Anfrage, Modell, Tokens, Latenz und Fehler.

## 9.9 Schlüsseldateien

| Datei | Zweck |
|:------|:------|
| `artifacts/api-server/src/services/ai.service.ts` | Kernlogik: RAG, Streaming, Prompt-Aufbau |
| `artifacts/api-server/src/routes/ai.ts` | AI-Endpunkte |
| `artifacts/wiki-frontend/src/components/ai/GlobalAssistant.tsx` | Globaler Assistent UI |
| `artifacts/wiki-frontend/src/components/ai/PageAssistant.tsx` | Seitenassistent UI |
| `artifacts/wiki-frontend/src/components/settings/AISettingsTab.tsx` | KI-Einstellungen UI |
| `lib/db/src/schema/ai-settings.ts` | DB-Schema für KI-Einstellungen und Logs |

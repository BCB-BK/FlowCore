/**
 * Beschreibung der FlowCore Content-API (v1) als OpenAPI-3.0-Dokument.
 *
 * Wird unter /api/content/v1/openapi.json ausgeliefert, damit sie sich direkt
 * in Salesforce (External Services), Postman, die Power Platform oder einen
 * Codegenerator importieren lässt. Das Dokument beschreibt nur die Form der
 * Schnittstelle — Inhalte liefert es nicht. Die Route selbst verlangt keinen
 * Schlüssel, die globale Anmeldesperre greift davor jedoch auch hier: Der
 * Abruf braucht denselben Header wie die Daten (siehe docs/30-CONTENT-API.md).
 */
export function buildContentApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.1",
    info: {
      title: "FlowCore Content-API",
      version: "1.1.0",
      description: [
        "Lesender Zugriff auf veröffentlichte FlowCore-Inhalte für externe Systeme.",
        "",
        "Die Authentifizierung erfolgt über einen Integrationsschlüssel im Header",
        "`X-FlowCore-Api-Key`. Jeder Schlüssel trägt seine eigene Freigabe: höchste",
        "Vertraulichkeitsstufe, erlaubte Seitentypen, freigegebene Teilbäume und",
        "Einzelseiten sowie Marken- und Bereichszuschnitt. Was ein Schlüssel sehen",
        "darf, verrät `/v1/scope`.",
        "",
        "Ausgeliefert werden ausschließlich veröffentlichte Stände. Arbeitskopien,",
        "Entwürfe und Seiten in Prüfung verlassen FlowCore nicht.",
        "",
        "**Exportvertrag** (`contract` in jeder Seitenantwort): Seitenidentität,",
        "aktuelle Revision, Veröffentlichungs- und Entscheidungsstand mit Herkunft,",
        "Herkunftsfassung, Marke und Markenebene, Prüfrhythmus und -termin,",
        "Eltern-ID und Sortierung, typisierte Beziehungen, Verweisvorkommen im",
        "Inhalt sowie Inhalt und Prüfsumme.",
        "",
        "**Links:** Alle Links in `contentMarkdown`, `media`, `structuredData` und",
        "`childPages` sind absolute URLs auf Basis von `linkBase`. Ein eigener",
        "Resolver ist nicht nötig.",
        "",
        "**Reihenfolge und Seitenweise:** `/v1/pages` liefert aufsteigend nach",
        "`updatedAt`. Wird während einer Blätterfolge eine Seite geändert, kann sie",
        "ihre Position wechseln; der Abgleich über `/v1/changes?since=<checkpoint>`",
        "am Ende eines Laufs zeigt genau diese Fälle an.",
      ].join("\n"),
    },
    servers: [{ url: `${baseUrl}/api/content` }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/v1/scope": {
        get: {
          operationId: "GetScope",
          summary: "Freigabe des verwendeten Schlüssels",
          description:
            "Selbstauskunft: welche Vertraulichkeitsstufe, Seitentypen, Strukturbereiche und Marken dieser Schlüssel lesen darf und wie viele Seiten das aktuell sind.",
          responses: {
            "200": {
              description: "Freigabe",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Scope" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/pages": {
        get: {
          operationId: "ListPages",
          summary: "Freigegebene Seiten auflisten",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 25,
              },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
            {
              name: "pageType",
              in: "query",
              description: "Auf einen Seitentyp einschränken.",
              schema: { type: "string" },
            },
            {
              name: "updatedSince",
              in: "query",
              description:
                "Nur Seiten, die nach diesem Zeitpunkt geändert wurden (ISO 8601).",
              schema: { type: "string", format: "date-time" },
            },
          ],
          responses: {
            "200": {
              description: "Seitenliste",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PageList" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/pages/{id}": {
        get: {
          operationId: "GetPage",
          summary: "Eine Seite mit vollem Inhalt abrufen",
          description:
            "Der Inhalt kommt genau einmal: `format=markdown` (Standard) liefert `contentMarkdown` mit allen beschrifteten Textabschnitten, Tabellen und Seitenlinks, dazu `structuredData` für Felder, die kein Fließtext sind. `format=text` liefert stattdessen `contentText`. `format=full` liefert zusätzlich beide Textfassungen und alle strukturierten Felder (ohne Editor-JSON).",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "format",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["markdown", "text", "full"],
                default: "markdown",
              },
              description: "Antwortformat, siehe Beschreibung",
            },
          ],
          responses: {
            "200": {
              description: "Seiteninhalt",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Page" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "400": {
              description: "Unbekanntes Format",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "403": {
              description:
                "Seite liegt außerhalb der Freigabe dieses Schlüssels. Das Feld `reason` nennt die Dimension.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Seite nicht gefunden oder nicht veröffentlicht",
            },
          },
        },
      },
      "/v1/changes": {
        get: {
          operationId: "GetChanges",
          summary: "Änderungen seit dem letzten Abgleich",
          description: [
            "Für die laufende Synchronisation. `since` grenzt auf Änderungen ein,",
            "`knownIds` meldet zurück, welche davon nicht mehr freigegeben sind —",
            "diese sollten im Zielsystem entfernt werden. `checkpoint` ist der",
            "Zeitstempel für den nächsten Aufruf.",
          ].join(" "),
          parameters: [
            {
              name: "since",
              in: "query",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "knownIds",
              in: "query",
              description:
                "Kommagetrennte Liste der im Zielsystem vorhandenen Seiten-IDs.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Änderungen",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Changes" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/search": {
        post: {
          operationId: "SearchPages",
          summary: "Volltextsuche im freigegebenen Ausschnitt",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["query"],
                  properties: {
                    query: { type: "string", minLength: 1, maxLength: 500 },
                    pageType: { type: "string" },
                    limit: {
                      type: "integer",
                      minimum: 1,
                      maximum: 50,
                      default: 10,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Treffer",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      query: { type: "string" },
                      results: {
                        type: "array",
                        items: { $ref: "#/components/schemas/SearchHit" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/v1/glossary": {
        get: {
          operationId: "ListGlossary",
          summary: "Glossarbegriffe abrufen",
          responses: {
            "200": {
              description: "Glossar",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      items: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-FlowCore-Api-Key",
        },
      },
      responses: {
        Unauthorized: {
          description:
            "Schlüssel fehlt, ist ungültig, widerrufen oder abgelaufen",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            reason: { type: "string" },
          },
        },
        Scope: {
          type: "object",
          properties: {
            name: { type: "string" },
            targetSystem: { type: "string", nullable: true },
            maxConfidentialityLevel: { type: "string" },
            pageTypes: {
              description: 'Liste der Seitentypen oder "alle".',
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
            },
            accessiblePageCount: { type: "integer" },
            rateLimitPerMinute: { type: "integer" },
          },
        },
        PageSummary: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            displayCode: { type: "string" },
            title: { type: "string" },
            pageType: { type: "string" },
            confidentiality: { type: "string" },
            updatedAt: { type: "string", format: "date-time" },
            url: { type: "string" },
          },
        },
        PageList: {
          type: "object",
          properties: {
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            hasMore: { type: "boolean" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/PageSummary" },
            },
          },
        },
        SearchHit: {
          allOf: [
            { $ref: "#/components/schemas/PageSummary" },
            {
              type: "object",
              properties: {
                summary: { type: "string" },
                score: { type: "number" },
              },
            },
          ],
        },
        Changes: {
          type: "object",
          properties: {
            since: { type: "string", format: "date-time", nullable: true },
            checkpoint: { type: "string", format: "date-time" },
            changed: {
              type: "array",
              items: { $ref: "#/components/schemas/PageSummary" },
            },
            removed: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Seiten, die nicht mehr freigegeben sind und im Zielsystem entfernt werden sollten.",
            },
          },
        },
        Page: {
          type: "object",
          description:
            "Seite mit Inhalt, Verknüpfungen und Governance-Angaben. Welche Inhaltsfelder enthalten sind, bestimmt `format`.",
          properties: {
            nodeId: { type: "string", format: "uuid" },
            displayCode: { type: "string" },
            title: { type: "string" },
            pageType: { type: "string" },
            version: { type: "string", nullable: true },
            summary: { type: "string" },
            contract: {
              type: "object",
              description:
                "Name und Version des Exportvertrags, den diese Antwort erfüllt.",
              properties: {
                name: { type: "string" },
                version: { type: "string" },
                stand: { type: "string" },
              },
            },
            linkBase: {
              type: "string",
              description:
                "Basis, gegen die FlowCore-Links in dieser Antwort aufgelöst sind.",
            },
            format: { type: "string", enum: ["markdown", "text", "full"] },
            parentNodeId: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "Elternseite als Identität, nicht nur als Textpfad.",
            },
            sortOrder: {
              type: "integer",
              description:
                "Gespeicherte Reihenfolge unter der Elternseite (aufsteigend).",
            },
            pageMetadata: {
              type: "object",
              description:
                "Fachliche Metadaten aus dem Metadatenblock der Revision. Nicht gepflegte Werte sind null.",
              properties: {
                brandName: { type: "string", nullable: true },
                brandLevel: {
                  type: "string",
                  nullable: true,
                  description: "dachmarke | einzelmarke | submarke",
                },
                sourceVersion: {
                  type: "string",
                  nullable: true,
                  description:
                    "Historische Herkunftsfassung des Quellpakets — nicht die FlowCore-Revision.",
                },
                reviewCycleMonths: {
                  type: "integer",
                  nullable: true,
                  description:
                    "Wiederholungsregel der Prüfung; getrennt von reviewDue (nächster Termin).",
                },
                sourceOfTruth: { type: "string", nullable: true },
                ownerDisplay: { type: "string", nullable: true },
              },
            },
            governance: {
              type: "object",
              description:
                "Statuswerte mit Herkunft und Bedeutung. Jeder Eintrag nennt in `herkunft` das Speicherfeld oder sagt ausdrücklich, dass der Wert ein Standardwert bzw. nicht gepflegt ist. Publikationsstand, redaktioneller Entscheidungsstand und normative Verbindlichkeit sind drei verschiedene Dimensionen.",
              properties: {
                publicationStatus: {
                  $ref: "#/components/schemas/Herkunftswert",
                },
                decisionStatus: { $ref: "#/components/schemas/Herkunftswert" },
                authorityLevel: { $ref: "#/components/schemas/Herkunftswert" },
                sourcePriority: { $ref: "#/components/schemas/Herkunftswert" },
                contentRole: {
                  allOf: [{ $ref: "#/components/schemas/Herkunftswert" }],
                  description:
                    "navigation = Register/Übersicht, content = Seite mit eigenem fachlichem Inhalt.",
                },
              },
            },
            contentLinks: {
              type: "array",
              description:
                "Jedes Vorkommen eines Seitenverweises im gelesenen Inhalt — mit Feld, Tabellenposition (table/row/column ab 1, row einschließlich Kopfzeile) und Ziel-UUID. Damit sind Zielidentitäten prüfbar, ohne Markdown zu zerlegen.",
              items: { $ref: "#/components/schemas/ContentLink" },
            },
            childPages: {
              type: "array",
              nullable: true,
              description:
                "Direkte Unterseiten in gespeicherter Reihenfolge (sortOrder, dann Titel, dann ID). null, wenn es mehr als 12 sind — dann topChildPages und childPagesSearchHint verwenden.",
              items: { $ref: "#/components/schemas/ChildPage" },
            },
            contentText: {
              type: "string",
              description: "Nur bei format=text und format=full",
            },
            contentMarkdown: {
              type: "string",
              description: "Nur bei format=markdown und format=full",
            },
            structuredFields: {
              type: "object",
              description: "Nur bei format=full; ohne Editor-JSON",
            },
            structuredData: {
              type: "object",
              description:
                "Bei format=markdown und format=text: Felder, die kein Fließtext sind (Verweislisten, Tabellen-Widgets)",
            },
            media: {
              type: "array",
              items: { type: "object" },
              description: "Bilder, Dateien und Videos der Seite",
            },
            relations: {
              type: "array",
              description:
                "Gerichtete Beziehungen dieser Seite mit ihrem gespeicherten Typ: inline_wiki_link = Seitenverweis aus dem Inhalt, implements_policy = typisierte Umsetzung einer Regelseite. Der Typ wird nicht aus Titeln abgeleitet.",
              items: { $ref: "#/components/schemas/Relation" },
            },
            tags: { type: "array", items: { type: "string" } },
            ownerName: { type: "string", nullable: true },
            confidentiality: { type: "string", nullable: true },
            validFrom: { type: "string", nullable: true },
            reviewDue: { type: "string", nullable: true },
            sourceUrl: { type: "string" },
            publishedAt: { type: "string", nullable: true },
            lastModifiedAt: { type: "string", nullable: true },
            contentHash: {
              type: "string",
              description:
                "SHA-256 über das stabil sortierte JSON aus content, structuredFields, title und versionLabel der veröffentlichten Revision (Inhaltshash des Quellsystems). Er ist KEIN Bytehash der ausgelieferten Antwort oder einer erzeugten Datei — ein Dateihash ist zusätzlich vom Verbraucher zu bilden.",
            },
          },
        },
        Herkunftswert: {
          type: "object",
          properties: {
            wert: {
              description: "Der Wert selbst; null heißt: nicht gepflegt.",
              nullable: true,
            },
            herkunft: {
              type: "string",
              description:
                "Speicherfeld, aus dem der Wert stammt, oder ausdrücklich »standardwert« bzw. »nicht gepflegt«.",
            },
            bedeutung: { type: "string" },
          },
        },
        ContentLink: {
          type: "object",
          properties: {
            targetNodeId: { type: "string", format: "uuid" },
            label: { type: "string" },
            url: { type: "string" },
            kind: { type: "string", enum: ["wikiLink", "href"] },
            section: {
              type: "string",
              description:
                "Abschnittsschlüssel des Seitentyps oder _editorContent für den Inhaltsbereich.",
            },
            inTable: { type: "boolean" },
            table: { type: "integer", nullable: true },
            row: { type: "integer", nullable: true },
            column: { type: "integer", nullable: true },
          },
        },
        ChildPage: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            displayCode: { type: "string" },
            pageType: { type: "string" },
            sortOrder: { type: "integer" },
            shortDescription: { type: "string" },
            sourceUrl: { type: "string" },
          },
        },
        Relation: {
          type: "object",
          properties: {
            targetNodeId: { type: "string", format: "uuid" },
            targetDisplayCode: { type: "string", nullable: true },
            targetTitle: { type: "string", nullable: true },
            relationType: { type: "string" },
            description: { type: "string", nullable: true },
          },
        },
      },
    },
  };
}

/**
 * Beschreibung der FlowCore Content-API (v1) als OpenAPI-3.0-Dokument.
 *
 * Wird unter /api/content/v1/openapi.json ohne Schlüssel ausgeliefert, damit
 * sie sich direkt in Salesforce (External Services), Postman, die Power
 * Platform oder einen Codegenerator importieren lässt. Das Dokument
 * beschreibt nur die Form der Schnittstelle — Inhalte liefert es nicht.
 */
export function buildContentApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.1",
    info: {
      title: "FlowCore Content-API",
      version: "1.0.0",
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
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
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
            "Vollständige Seite mit Text, strukturierten Feldern, Verknüpfungen und Governance-Angaben.",
          properties: {
            nodeId: { type: "string", format: "uuid" },
            displayCode: { type: "string" },
            title: { type: "string" },
            pageType: { type: "string" },
            version: { type: "string", nullable: true },
            summary: { type: "string" },
            contentText: { type: "string" },
            contentMarkdown: { type: "string" },
            structuredFields: { type: "object" },
            tags: { type: "array", items: { type: "string" } },
            ownerName: { type: "string", nullable: true },
            confidentiality: { type: "string", nullable: true },
            validFrom: { type: "string", nullable: true },
            reviewDue: { type: "string", nullable: true },
            sourceUrl: { type: "string" },
            publishedAt: { type: "string", nullable: true },
            lastModifiedAt: { type: "string", nullable: true },
            contentHash: { type: "string" },
          },
        },
      },
    },
  };
}

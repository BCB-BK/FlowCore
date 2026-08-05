/**
 * Static OpenAPI 3.0 document describing the FlowCore Custom Connector
 * surface (Cluster 13, optional). Imported directly into the Power Apps /
 * Copilot Studio Custom Connector wizard so specialist agents can call
 * FlowCore as a Tool/Action. This is NOT the same integration as the Graph
 * Connector knowledge source (Cluster 12) — see docs/copilot-studio.
 */
export function buildConnectorOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.1",
    info: {
      title: "FlowCore Custom Connector",
      description:
        "Live-Abfrage-Tool für Copilot Studio Spezialagenten (Prozessmanagement, Marketing, QM, EHiP u.a.) gegen FlowCore-Inhalte. Erfordert einen agentenspezifischen API-Key (X-FlowCore-Api-Key), der auf agent_scope/brand_scope und eine maximale Vertraulichkeitsstufe beschränkt ist.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/copilot/search": {
        post: {
          operationId: "SearchFlowCore",
          summary: "Durchsucht veröffentlichte FlowCore-Inhalte",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Treffer",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResponse" },
                },
              },
            },
            "400": {
              description:
                "Ungültige Anfrage oder Scope außerhalb der Berechtigung des API-Keys",
            },
            "401": { description: "Fehlender oder ungültiger API-Key" },
          },
        },
      },
      "/api/copilot/nodes/{id}": {
        get: {
          operationId: "GetFlowCoreNode",
          summary: "Liefert eine einzelne veröffentlichte FlowCore-Seite",
          security: [{ ApiKeyAuth: [] }],
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
              description: "Seite",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/NodeResponse" },
                },
              },
            },
            "403": {
              description: "API-Key ist für diese Seite nicht berechtigt",
            },
            "404": { description: "Nicht gefunden oder nicht veröffentlicht" },
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
      schemas: {
        SearchRequest: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string", description: "Suchbegriff" },
            brandScope: {
              type: "array",
              items: { type: "string" },
              description:
                "Optionaler Filter auf Marken (muss innerhalb der Berechtigung des API-Keys liegen)",
            },
            agentScope: {
              type: "array",
              items: { type: "string" },
              description:
                "Optionaler Filter auf Themenbereiche (muss innerhalb der Berechtigung des API-Keys liegen)",
            },
            limit: { type: "integer", minimum: 1, maximum: 25, default: 10 },
          },
        },
        SearchResponse: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: { $ref: "#/components/schemas/SearchResultItem" },
            },
          },
        },
        SearchResultItem: {
          type: "object",
          description:
            "Quellenblock-Metadaten für eine Antwort: displayCode/title/url/version/ownerName führend zitieren, nicht technical.nodeId oder technical.sourcePriority.",
          properties: {
            displayCode: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            url: { type: "string" },
            version: { type: "string", nullable: true },
            ownerName: { type: "string", nullable: true },
            authorityLevel: { type: "string", nullable: true },
            brandScope: { type: "array", items: { type: "string" } },
            agentScope: { type: "array", items: { type: "string" } },
            technical: {
              type: "object",
              description:
                "Nur für Folgeaufrufe (GetFlowCoreNode) oder Konfliktauflösung/Debug — kein Standard-Zitierfeld.",
              properties: {
                nodeId: { type: "string" },
                sourcePriority: { type: "integer" },
              },
            },
          },
        },
        NodeResponse: {
          type: "object",
          description:
            "Copilot-freundliche Seitenprojektion: Quellenblock (displayCode/title/sourceUrl/version/ownerName) führend; technische Felder (nodeId, revision, status, sourcePriority) sind unter `technical` verschachtelt und nicht Teil der Standardantwort. Enthält außerdem hasChildren/childPageCount/childPages (oder bei sehr vielen Kindern topChildPages + childPagesSearchHint) sowie childPagesGuidance — ein einsatzbereiter Hinweissatz zur fachlichen Relevanz der Unterseiten (z.B. Prozessübersicht vs. Dokumentationsregister).",
          properties: {
            hasChildren: { type: "boolean" },
            childPageCount: { type: "integer" },
            childPages: {
              type: "array",
              nullable: true,
              description:
                "Vollständige Liste, sofern nicht zu groß (siehe childPagesSearchHint).",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  displayCode: { type: "string" },
                  pageType: { type: "string" },
                  shortDescription: { type: "string" },
                  sourceUrl: { type: "string" },
                },
              },
            },
            topChildPages: {
              type: "array",
              nullable: true,
              description:
                "Repräsentative Auswahl, wenn childPages null ist, weil die vollständige Liste zu groß war.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  displayCode: { type: "string" },
                  pageType: { type: "string" },
                  shortDescription: { type: "string" },
                  sourceUrl: { type: "string" },
                },
              },
            },
            childPagesSearchHint: {
              type: "string",
              nullable: true,
              description:
                "Nur gesetzt, wenn childPages null ist: Hinweis, per SearchFlowCore weitere Unterseiten zu finden.",
            },
            childPagesGuidance: {
              type: "string",
              nullable: true,
              description:
                'Einsatzbereiter deutscher Hinweissatz zur fachlichen Relevanz der Unterseiten, z.B. "Die Detailseiten behandeln die konkrete Ausarbeitung." Null, wenn die Seite keine Unterseiten hat.',
            },
          },
        },
      },
    },
  };
}

/**
 * Power Apps / Power Automate Custom Connectors only accept OpenAPI 2.0
 * (Swagger) definitions on import, NOT OpenAPI 3.x — see
 * https://learn.microsoft.com/en-us/connectors/custom-connectors/define-openapi-definition
 * ("The OpenAPI definition needs to be in OpenAPI 2.0 format."). This is the
 * document to import into the Custom Connector wizard; the 3.0 document
 * above is kept as a human-readable reference only.
 */
export function buildConnectorSwagger2Spec(baseUrl: string) {
  const url = new URL(baseUrl);
  return {
    swagger: "2.0",
    info: {
      title: "FlowCore Custom Connector",
      description:
        "Live-Abfrage-Tool für Copilot Studio Spezialagenten (Prozessmanagement, Marketing, QM, EHiP u.a.) gegen FlowCore-Inhalte. Erfordert einen agentenspezifischen API-Key (X-FlowCore-Api-Key), der auf agent_scope/brand_scope und eine maximale Vertraulichkeitsstufe beschränkt ist.",
      version: "1.0.0",
    },
    host: url.host,
    basePath: url.pathname === "/" ? "" : url.pathname,
    schemes: [url.protocol.replace(":", "")],
    consumes: ["application/json"],
    produces: ["application/json"],
    securityDefinitions: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-FlowCore-Api-Key",
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/copilot/search": {
        post: {
          operationId: "SearchFlowCore",
          summary: "Durchsucht veröffentlichte FlowCore-Inhalte",
          parameters: [
            {
              name: "body",
              in: "body",
              required: true,
              schema: {
                type: "object",
                required: ["query"],
                properties: {
                  query: { type: "string", description: "Suchbegriff" },
                  brandScope: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Optionaler Filter auf Marken (muss innerhalb der Berechtigung des API-Keys liegen)",
                  },
                  agentScope: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Optionaler Filter auf Themenbereiche (muss innerhalb der Berechtigung des API-Keys liegen)",
                  },
                  limit: {
                    type: "integer",
                    minimum: 1,
                    maximum: 25,
                    default: 10,
                  },
                },
              },
            },
          ],
          responses: {
            "200": {
              description: "Treffer",
              schema: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      description:
                        "Quellenblock-Metadaten: displayCode/title/url/version/ownerName führend zitieren, nicht technical.nodeId oder technical.sourcePriority.",
                      properties: {
                        displayCode: { type: "string" },
                        title: { type: "string" },
                        summary: { type: "string" },
                        url: { type: "string" },
                        version: { type: "string" },
                        ownerName: { type: "string" },
                        authorityLevel: { type: "string" },
                        brandScope: {
                          type: "array",
                          items: { type: "string" },
                        },
                        agentScope: {
                          type: "array",
                          items: { type: "string" },
                        },
                        technical: {
                          type: "object",
                          description:
                            "Nur für Folgeaufrufe (GetFlowCoreNode) oder Konfliktauflösung/Debug.",
                          properties: {
                            nodeId: { type: "string" },
                            sourcePriority: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description:
                "Ungültige Anfrage oder Scope außerhalb der Berechtigung des API-Keys",
            },
            "401": { description: "Fehlender oder ungültiger API-Key" },
          },
        },
      },
      "/api/copilot/nodes/{id}": {
        get: {
          operationId: "GetFlowCoreNode",
          summary: "Liefert eine einzelne veröffentlichte FlowCore-Seite",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              type: "string",
            },
          ],
          responses: {
            "200": {
              description: "Seite",
              schema: {
                type: "object",
                description:
                  "Copilot-freundliche Seitenprojektion: Quellenblock (displayCode/title/sourceUrl/version/ownerName) führend; technische Felder (nodeId, revision, status, sourcePriority) sind unter `technical` verschachtelt und nicht Teil der Standardantwort. Enthält außerdem hasChildren/childPageCount/childPages (oder bei sehr vielen Kindern topChildPages + childPagesSearchHint) sowie childPagesGuidance — ein einsatzbereiter Hinweissatz zur fachlichen Relevanz der Unterseiten (z.B. Prozessübersicht vs. Dokumentationsregister).",
                properties: {
                  hasChildren: { type: "boolean" },
                  childPageCount: { type: "integer" },
                  childPages: {
                    type: "array",
                    description:
                      "Vollständige Liste, sofern nicht zu groß (siehe childPagesSearchHint).",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        displayCode: { type: "string" },
                        pageType: { type: "string" },
                        shortDescription: { type: "string" },
                        sourceUrl: { type: "string" },
                      },
                    },
                  },
                  topChildPages: {
                    type: "array",
                    description:
                      "Repräsentative Auswahl, wenn childPages null ist, weil die vollständige Liste zu groß war.",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        displayCode: { type: "string" },
                        pageType: { type: "string" },
                        shortDescription: { type: "string" },
                        sourceUrl: { type: "string" },
                      },
                    },
                  },
                  childPagesSearchHint: {
                    type: "string",
                    description:
                      "Nur gesetzt, wenn childPages null ist: Hinweis, per SearchFlowCore weitere Unterseiten zu finden.",
                  },
                  childPagesGuidance: {
                    type: "string",
                    description:
                      'Einsatzbereiter deutscher Hinweissatz zur fachlichen Relevanz der Unterseiten, z.B. "Die Detailseiten behandeln die konkrete Ausarbeitung." Null, wenn die Seite keine Unterseiten hat.',
                  },
                },
              },
            },
            "403": {
              description: "API-Key ist für diese Seite nicht berechtigt",
            },
            "404": { description: "Nicht gefunden oder nicht veröffentlicht" },
          },
        },
      },
    },
  };
}

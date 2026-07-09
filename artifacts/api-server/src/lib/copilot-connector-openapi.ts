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
            "400": { description: "Ungültige Anfrage oder Scope außerhalb der Berechtigung des API-Keys" },
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
            "403": { description: "API-Key ist für diese Seite nicht berechtigt" },
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
              description: "Optionaler Filter auf Marken (muss innerhalb der Berechtigung des API-Keys liegen)",
            },
            agentScope: {
              type: "array",
              items: { type: "string" },
              description: "Optionaler Filter auf Themenbereiche (muss innerhalb der Berechtigung des API-Keys liegen)",
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
          properties: {
            nodeId: { type: "string" },
            displayCode: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            url: { type: "string" },
            version: { type: "string", nullable: true },
            authorityLevel: { type: "string", nullable: true },
            brandScope: { type: "array", items: { type: "string" } },
            agentScope: { type: "array", items: { type: "string" } },
          },
        },
        NodeResponse: {
          type: "object",
          description: "Vollständige Copilot-Projektion der veröffentlichten Seite (siehe FlowCore CopilotPageProjection).",
        },
      },
    },
  };
}

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required for seeding");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database...");

  const templates = [
    {
      templateType: "core_process_overview" as const,
      name: "Kernprozess-Übersicht",
      description:
        "Overview of a core process with SIPOC, KPIs, and interfaces",
      fieldSchema: {
        sections: [
          {
            key: "overview",
            label: "Übersicht",
            fields: [
              {
                key: "purpose",
                label: "Zweck & Geltungsbereich",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "exclusions",
                label: "Ausschlüsse",
                type: "rich_text" as const,
                required: false,
              },
              {
                key: "process_owner",
                label: "Prozesseigner",
                type: "reference" as const,
                required: true,
              },
            ],
          },
          {
            key: "sipoc",
            label: "SIPOC",
            fields: [
              {
                key: "suppliers",
                label: "Suppliers",
                type: "table" as const,
                required: false,
              },
              {
                key: "inputs",
                label: "Inputs",
                type: "table" as const,
                required: false,
              },
              {
                key: "process_steps",
                label: "Process",
                type: "table" as const,
                required: false,
              },
              {
                key: "outputs",
                label: "Outputs",
                type: "table" as const,
                required: false,
              },
              {
                key: "customers",
                label: "Customers",
                type: "table" as const,
                required: false,
              },
            ],
          },
          {
            key: "kpis",
            label: "KPIs & Kennzahlen",
            fields: [
              {
                key: "kpi_list",
                label: "KPIs",
                type: "table" as const,
                required: false,
              },
            ],
          },
          {
            key: "compliance",
            label: "Normbezug & Compliance",
            fields: [
              {
                key: "standards",
                label: "Normen & Standards",
                type: "rich_text" as const,
                required: false,
              },
              {
                key: "risks",
                label: "Risiken & Kontrollen",
                type: "table" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "area_overview" as const,
      name: "Bereichsübersicht",
      description: "Overview of an organizational area",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "Inhalt",
            fields: [
              {
                key: "description",
                label: "Beschreibung",
                type: "rich_text" as const,
                required: true,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "process_page_text" as const,
      name: "Prozessseite (Text)",
      description: "Text-based process documentation",
      fieldSchema: {
        sections: [
          {
            key: "procedure",
            label: "Ablauf",
            fields: [
              {
                key: "steps",
                label: "Verfahrensschritte",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "raci",
                label: "RACI-Matrix",
                type: "table" as const,
                required: false,
              },
            ],
          },
          {
            key: "interfaces",
            label: "Schnittstellen",
            fields: [
              {
                key: "systems",
                label: "Systeme",
                type: "table" as const,
                required: false,
              },
              {
                key: "documents",
                label: "Dokumente & Vorlagen",
                type: "table" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "process_page_graphic" as const,
      name: "Prozessseite (Grafik/Swimlane)",
      description: "Graphic/swimlane process documentation",
      fieldSchema: {
        sections: [
          {
            key: "diagram",
            label: "Diagramm",
            fields: [
              {
                key: "swimlane_data",
                label: "Swimlane-Daten",
                type: "json" as const,
                required: true,
              },
              {
                key: "description",
                label: "Erläuterung",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "procedure_instruction" as const,
      name: "Verfahrensanweisung",
      description: "Detailed procedure/work instruction",
      fieldSchema: {
        sections: [
          {
            key: "scope",
            label: "Geltungsbereich",
            fields: [
              {
                key: "purpose",
                label: "Zweck",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "scope",
                label: "Geltungsbereich",
                type: "rich_text" as const,
                required: true,
              },
            ],
          },
          {
            key: "procedure",
            label: "Durchführung",
            fields: [
              {
                key: "steps",
                label: "Schritte",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "responsibilities",
                label: "Verantwortlichkeiten",
                type: "table" as const,
                required: true,
              },
            ],
          },
          {
            key: "documents",
            label: "Mitgeltende Unterlagen",
            fields: [
              {
                key: "references",
                label: "Referenzen",
                type: "table" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "use_case" as const,
      name: "Use Case",
      description: "Use case documentation",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "Use Case",
            fields: [
              {
                key: "actor",
                label: "Akteur",
                type: "text" as const,
                required: true,
              },
              {
                key: "precondition",
                label: "Vorbedingung",
                type: "rich_text" as const,
                required: false,
              },
              {
                key: "main_flow",
                label: "Hauptablauf",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "alt_flows",
                label: "Alternativabläufe",
                type: "rich_text" as const,
                required: false,
              },
              {
                key: "postcondition",
                label: "Nachbedingung",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "policy" as const,
      name: "Richtlinie",
      description: "Policy document",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "Richtlinie",
            fields: [
              {
                key: "purpose",
                label: "Zweck",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "scope",
                label: "Geltungsbereich",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "policy_text",
                label: "Richtlinientext",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "enforcement",
                label: "Durchsetzung",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "role_profile" as const,
      name: "Rollenprofil",
      description: "Role profile with responsibilities",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "Rolle",
            fields: [
              {
                key: "role_name",
                label: "Rollenbezeichnung",
                type: "text" as const,
                required: true,
              },
              {
                key: "responsibilities",
                label: "Verantwortlichkeiten",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "qualifications",
                label: "Qualifikationen",
                type: "rich_text" as const,
                required: false,
              },
              {
                key: "authority",
                label: "Befugnisse",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "dashboard" as const,
      name: "Dashboard",
      description: "Dashboard/overview page",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "Dashboard",
            fields: [
              {
                key: "widgets",
                label: "Widget-Konfiguration",
                type: "json" as const,
                required: false,
              },
              {
                key: "description",
                label: "Beschreibung",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
    {
      templateType: "system_documentation" as const,
      name: "Systemdokumentation",
      description: "IT system documentation",
      fieldSchema: {
        sections: [
          {
            key: "main",
            label: "System",
            fields: [
              {
                key: "system_name",
                label: "Systemname",
                type: "text" as const,
                required: true,
              },
              {
                key: "description",
                label: "Beschreibung",
                type: "rich_text" as const,
                required: true,
              },
              {
                key: "interfaces",
                label: "Schnittstellen",
                type: "table" as const,
                required: false,
              },
              {
                key: "data_objects",
                label: "Datenobjekte",
                type: "table" as const,
                required: false,
              },
              {
                key: "access_rights",
                label: "Zugriffsrechte",
                type: "rich_text" as const,
                required: false,
              },
            ],
          },
        ],
      },
    },
  ];

  const insertedTemplates = await db
    .insert(schema.contentTemplatesTable)
    .values(templates)
    .onConflictDoNothing()
    .returning();
  console.log(`Inserted ${insertedTemplates.length} templates`);

  const kpTemplate = insertedTemplates.find(
    (t) => t.templateType === "core_process_overview",
  );

  const [rootNode] = await db
    .insert(schema.contentNodesTable)
    .values({
      immutableId: "WN-SEED0001",
      displayCode: "KP-001",
      title: "Kernprozess: Lehre & Studium",
      templateType: "core_process_overview",
      templateId: kpTemplate?.id,
      sortOrder: 1,
      status: "published",
    })
    .onConflictDoNothing({ target: schema.contentNodesTable.immutableId })
    .returning();

  if (!rootNode) {
    console.log("Seed data already exists, skipping...");
    await pool.end();
    return;
  }

  console.log(`Created root node: ${rootNode.id}`);

  const [childNode1] = await db
    .insert(schema.contentNodesTable)
    .values({
      immutableId: "WN-SEED0002",
      displayCode: "KP-001.PRZ-001",
      title: "Studierendenverwaltung",
      templateType: "process_page_text",
      parentNodeId: rootNode.id,
      sortOrder: 1,
      status: "draft",
    })
    .returning();

  const [childNode2] = await db
    .insert(schema.contentNodesTable)
    .values({
      immutableId: "WN-SEED0003",
      displayCode: "KP-001.VA-001",
      title: "Immatrikulationsverfahren",
      templateType: "procedure_instruction",
      parentNodeId: rootNode.id,
      sortOrder: 2,
      status: "draft",
    })
    .returning();

  console.log(`Created child nodes: ${childNode1.id}, ${childNode2.id}`);

  const [rev1] = await db
    .insert(schema.contentRevisionsTable)
    .values({
      nodeId: rootNode.id,
      revisionNo: 1,
      title: rootNode.title,
      status: "published",
      changeType: "major",
      changeSummary: "Initial version",
      versionLabel: "1.0",
      authorId: "system",
      validFrom: new Date(),
      content: {
        purpose:
          "Dieser Kernprozess beschreibt alle Aktivitäten rund um Lehre und Studium am Bildungscampus Backnang.",
      },
      structuredFields: {
        purpose: "Steuerung und Dokumentation des Lehr- und Studienbetriebs",
        exclusions: "Forschungsprojekte außerhalb des Lehrbetriebs",
      },
    })
    .returning();

  await db
    .update(schema.contentNodesTable)
    .set({
      currentRevisionId: rev1.id,
      publishedRevisionId: rev1.id,
    })
    .where(eq(schema.contentNodesTable.id, rootNode.id));

  const [rev2] = await db
    .insert(schema.contentRevisionsTable)
    .values({
      nodeId: rootNode.id,
      revisionNo: 2,
      title: rootNode.title,
      status: "draft",
      changeType: "minor",
      changeSummary: "Added KPI section",
      basedOnRevisionId: rev1.id,
      authorId: "system",
      changedFields: ["kpis"],
      content: {
        purpose:
          "Dieser Kernprozess beschreibt alle Aktivitäten rund um Lehre und Studium am Bildungscampus Backnang.",
        kpis: [
          { name: "Durchlaufzeit Immatrikulation", target: "< 5 Werktage" },
        ],
      },
    })
    .returning();

  console.log(`Created revisions: ${rev1.id} (v1.0), ${rev2.id} (draft)`);

  await db.insert(schema.contentRevisionEventsTable).values([
    { revisionId: rev1.id, eventType: "created", actorId: "system" },
    {
      revisionId: rev1.id,
      eventType: "published",
      actorId: "system",
      metadata: { versionLabel: "1.0" },
    },
    { revisionId: rev2.id, eventType: "created", actorId: "system" },
  ]);

  await db.insert(schema.contentRelationsTable).values({
    sourceNodeId: childNode2.id,
    targetNodeId: childNode1.id,
    relationType: "depends_on",
    description: "Immatrikulation depends on Studierendenverwaltung",
    createdBy: "system",
  });

  console.log("Created relation: depends_on");
  console.log("Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

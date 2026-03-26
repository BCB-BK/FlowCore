import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

interface PilotNode {
  title: string;
  templateType: string;
  displayCode: string;
  immutableId: string;
  parentDisplayCode?: string;
}

const PILOT_CONTENT: PilotNode[] = [
  {
    title: "Kernprozesse Bildungscampus",
    templateType: "core_process_overview",
    displayCode: "KP-0001",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Einschreibung und Aufnahme",
    templateType: "process_page_text",
    displayCode: "KP-0001.1",
    parentDisplayCode: "KP-0001",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Aufnahmeverfahren – Schritt für Schritt",
    templateType: "procedure_instruction",
    displayCode: "KP-0001.1.1",
    parentDisplayCode: "KP-0001.1",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Aufnahmerichtlinie",
    templateType: "policy",
    displayCode: "RL-0001",
    parentDisplayCode: "KP-0001.1",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Koordinator Einschreibung",
    templateType: "role_profile",
    displayCode: "RO-0001",
    parentDisplayCode: "KP-0001.1",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Formular: Einschreibungsantrag",
    templateType: "use_case",
    displayCode: "FO-0001",
    parentDisplayCode: "KP-0001.1",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Unterrichtsbetrieb und Lehre",
    templateType: "core_process_overview",
    displayCode: "KP-0002",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Stundenplanung und Raumverwaltung",
    templateType: "process_page_text",
    displayCode: "KP-0002.1",
    parentDisplayCode: "KP-0002",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Stundenplan erstellen",
    templateType: "procedure_instruction",
    displayCode: "AA-0001",
    parentDisplayCode: "KP-0002.1",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Datenschutz-Richtlinie",
    templateType: "policy",
    displayCode: "RL-0002",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "IT-Sicherheitsrichtlinie",
    templateType: "policy",
    displayCode: "RL-0003",
    immutableId: `pilot-${randomUUID()}`,
  },
  {
    title: "Willkommen im Bildungscampus Wiki",
    templateType: "area_overview",
    displayCode: "IN-0001",
    immutableId: `pilot-${randomUUID()}`,
  },
];

async function migratePilotContent() {
  console.log("Starting pilot content migration...\n");

  const codeToId = new Map<string, string>();

  for (const node of PILOT_CONTENT) {
    const existing = await db.execute(sql`
      SELECT id FROM content_nodes
      WHERE display_code = ${node.displayCode}
        AND NOT is_deleted
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as Record<string, unknown>;
      codeToId.set(node.displayCode, row.id as string);
      console.log(`  SKIP (exists): ${node.displayCode} — ${node.title}`);
      continue;
    }

    let parentId: string | null = null;
    if (node.parentDisplayCode) {
      parentId = codeToId.get(node.parentDisplayCode) ?? null;
      if (!parentId) {
        const parentResult = await db.execute(sql`
          SELECT id FROM content_nodes
          WHERE display_code = ${node.parentDisplayCode}
            AND NOT is_deleted
          LIMIT 1
        `);
        if (parentResult.rows.length > 0) {
          parentId = (parentResult.rows[0] as Record<string, unknown>)
            .id as string;
        }
      }
    }

    const result = await db.execute(sql`
      INSERT INTO content_nodes (immutable_id, display_code, title, template_type, parent_node_id, status, owner_id)
      VALUES (
        ${node.immutableId},
        ${node.displayCode},
        ${node.title},
        ${node.templateType},
        ${parentId},
        'draft',
        '00000000-0000-0000-0000-000000000001'
      )
      RETURNING id
    `);

    const newId = (result.rows[0] as Record<string, unknown>).id as string;
    codeToId.set(node.displayCode, newId);
    console.log(`  CREATE: ${node.displayCode} — ${node.title} (${newId})`);
  }

  console.log(`\nPilot migration complete. ${codeToId.size} nodes processed.`);
}

migratePilotContent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

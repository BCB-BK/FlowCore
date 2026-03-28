import pg from "pg";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required for applying triggers");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyTriggers() {
  const triggerDir = path.dirname(fileURLToPath(import.meta.url));
  const sqlFiles = fs
    .readdirSync(triggerDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of sqlFiles) {
      const filePath = path.join(triggerDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      console.log(`Applying trigger: ${file}`);
      await client.query(content);
      console.log(`  ✓ ${file} applied`);
    }
    console.log("All triggers applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

applyTriggers().catch((err) => {
  console.error("Failed to apply triggers:", err);
  process.exit(1);
});

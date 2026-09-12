/**
 * Temporärer Integrationsschlüssel für einen Nachweisabzug der Content-API.
 *
 * WARUM: Der Reaudit FC-RA-20260911 (T-05) verlangt unveränderte HTTP-
 * Rohantworten. Dafür braucht es einen Schlüssel mit eng begrenzter Freigabe,
 * der nach dem Abzug sofort widerrufen wird — kein Dauerzugang.
 *
 * Aufruf:
 *   tsx src/scripts/nachweis-schluessel.ts anlegen <wurzel-uuid> [--stunden 3]
 *   tsx src/scripts/nachweis-schluessel.ts widerrufen <schluessel-id>
 */
import {
  createIntegrationKey,
  revokeIntegrationKey,
} from "../services/integration-key.service";

const OWNER_PRINCIPAL = "c911a9df-b47c-4539-9d26-c106825968b6";

async function main(): Promise<void> {
  const [befehl, wert] = process.argv.slice(2);
  const i = process.argv.indexOf("--stunden");
  const stunden = i > -1 ? Number(process.argv[i + 1]) : 3;

  if (befehl === "anlegen" && wert) {
    const { id, plainKey } = await createIntegrationKey({
      name: `Nachweisabzug Reaudit FC-RA-20260911 (temporär, ${new Date().toISOString().slice(0, 16)})`,
      description:
        "Zeitlich begrenzter Schlüssel für den Nachweisabzug der Content-API. Nach dem Abzug widerrufen.",
      targetSystem: "Nachweisabzug",
      maxConfidentialityLevel: "internal",
      templateTypes: [],
      brandScopes: [],
      agentScopes: [],
      nodeSelections: [
        { nodeId: wert, mode: "include", includeDescendants: true },
      ],
      ipAllowlist: [],
      rateLimitPerMinute: 600,
      expiresAt: new Date(Date.now() + stunden * 60 * 60 * 1000),
      createdBy: OWNER_PRINCIPAL,
    });
    console.log(JSON.stringify({ keyId: id, plainKey }));
    process.exit(0);
  }

  if (befehl === "widerrufen" && wert) {
    const ok = await revokeIntegrationKey(wert);
    console.log(JSON.stringify({ keyId: wert, widerrufen: ok }));
    process.exit(ok ? 0 : 1);
  }

  console.error(
    "Aufruf: nachweis-schluessel.ts anlegen <wurzel-uuid> [--stunden 3] | widerrufen <schluessel-id>",
  );
  process.exit(2);
}

main().catch((fehler: unknown) => {
  console.error("ABBRUCH:", fehler instanceof Error ? fehler.message : fehler);
  process.exit(1);
});

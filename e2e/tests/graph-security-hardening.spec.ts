import { test, expect } from "@playwright/test";
import { Client } from "pg";

const API = "/api";
const ADMIN_A = "2804b3e6-46c0-43e4-8e6b-5ee6a588c8dd"; // system_admin
const ADMIN_B = "ce73daf3-fd70-4578-8bff-b05535623a73"; // second system_admin (four-eyes approver)

const INTERNAL_STANDARD_GROUP_ID = "33333333-3333-4333-8333-333333333333";
const EXECUTIVE_GROUP_ID = "44444444-4444-4444-8444-444444444444";

async function setSetting(
  request: import("@playwright/test").APIRequestContext,
  key: string,
  value: string,
) {
  const res = await request.put(`${API}/admin/system-settings/${key}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { value },
  });
  expect(res.status()).toBe(200);
}

async function setMockMode(
  request: import("@playwright/test").APIRequestContext,
  enabled: boolean,
) {
  await setSetting(request, "graph_sync_mock_mode", enabled ? "true" : "false");
}

async function setFaultInjection(
  request: import("@playwright/test").APIRequestContext,
  value: "none" | "auth_unconfigured" | "api_error",
) {
  await setSetting(request, "graph_sync_fault_injection", value);
}

async function seedGroupMapping(
  request: import("@playwright/test").APIRequestContext,
  tier: "internal_standard" | "restricted" | "executive",
  entraGroupId: string,
) {
  const res = await request.put(`${API}/graph-connector/group-mappings/${tier}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { entraGroupId, label: `Cluster11 e2e ${tier}` },
  });
  expect(res.status()).toBe(200);
}

async function deleteGroupMapping(
  request: import("@playwright/test").APIRequestContext,
  tier: "internal_standard" | "restricted" | "executive",
) {
  await request.delete(`${API}/graph-connector/group-mappings/${tier}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
}

const VALID_AGENT_METADATA = {
  agent_enabled: true,
  agent_scope: ["global"],
  authority_level: "binding",
  source_priority: 2,
  brand_scope: ["BCB"],
  decision_status: "decided",
  copilot_summary: "Testzusammenfassung",
  copilot_keywords: ["test", "copilot"],
  confidentiality: "internal",
};

async function createNodeWithWorkingCopy(
  request: import("@playwright/test").APIRequestContext,
  title: string,
) {
  const createRes = await request.post(`${API}/content/nodes`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { title, templateType: "policy" },
  });
  expect(createRes.status()).toBe(201);
  const node = await createRes.json();

  const wcRes = await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
  });
  const wc = await wcRes.json();
  return { node, workingCopyId: wc.id as string };
}

async function fillWorkingCopy(
  request: import("@playwright/test").APIRequestContext,
  workingCopyId: string,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  await request.patch(`${API}/content/working-copies/${workingCopyId}`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: {
      title,
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
      },
      structuredFields: { ...VALID_AGENT_METADATA, ...overrides },
    },
  });
}

async function publishWorkingCopy(
  request: import("@playwright/test").APIRequestContext,
  workingCopyId: string,
) {
  await request.post(`${API}/content/working-copies/${workingCopyId}/submit`, {
    headers: { "X-Dev-Principal-Id": ADMIN_A },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${workingCopyId}/approve`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { comment: "e2e" },
  });
  await request.post(`${API}/content/working-copies/${workingCopyId}/publish`, {
    headers: { "X-Dev-Principal-Id": ADMIN_B },
    data: { versionLabel: "v1.0" },
  });
}

async function createPublishedPage(
  request: import("@playwright/test").APIRequestContext,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  const { node, workingCopyId } = await createNodeWithWorkingCopy(request, title);
  await fillWorkingCopy(request, workingCopyId, title, overrides);
  await publishWorkingCopy(request, workingCopyId);
  return node;
}

async function clearNodeOwnerForAclTest(nodeId: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`UPDATE content_nodes SET owner_id = NULL WHERE id = $1`, [nodeId]);
    await client.query(`DELETE FROM node_ownership WHERE node_id = $1`, [nodeId]);
    await client.query(`DELETE FROM page_permissions WHERE node_id = $1`, [nodeId]);
  } finally {
    await client.end();
  }
}

async function withAllConfidentialAllowedRolePrincipalsTemporarilyUnmapped<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: adminRows } = await client.query(
      `SELECT DISTINCT ra.principal_id FROM role_assignments ra
       JOIN confidentiality_access_config cac ON ra.role::text = ANY(cac.allowed_roles)
       WHERE cac.level = 'confidential' AND ra.is_active = true`,
    );
    const principalIds = adminRows.map((r) => r.principal_id as string);
    return await withTemporarilyUnmappedPrincipals(principalIds, fn);
  } finally {
    await client.end();
  }
}

async function withTemporarilyUnmappedPrincipals<T>(
  principalIds: string[],
  fn: () => Promise<T>,
): Promise<T> {
  if (principalIds.length === 0) return fn();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, external_provider, external_id FROM principals WHERE id = ANY($1)`,
      [principalIds],
    );
    const originals = new Map(
      rows.map((r) => [r.id as string, { provider: r.external_provider, id: r.external_id }]),
    );
    // Temporarily strip the Entra identity of every principal that could
    // resolve as an authorized reader (e.g. all system_admins), so the ACL
    // resolves to authorized-but-unmapped principals only - it must
    // fail-closed rather than defaulting to "everyone".
    await client.query(
      `UPDATE principals SET external_provider = 'none', external_id = 'no-entra-mapping-e2e-' || id::text WHERE id = ANY($1)`,
      [principalIds],
    );
    try {
      return await fn();
    } finally {
      for (const [id, original] of originals) {
        await client.query(
          `UPDATE principals SET external_provider = $2, external_id = $3 WHERE id = $1`,
          [id, original.provider, original.id],
        );
      }
    }
  } finally {
    await client.end();
  }
}

async function getLatestLogEntry(
  request: import("@playwright/test").APIRequestContext,
  itemId: string,
) {
  const logRes = await request.get(
    `${API}/graph-connector/sync/log?itemId=${itemId}&limit=5`,
    { headers: { "X-Dev-Principal-Id": ADMIN_A } },
  );
  expect(logRes.status()).toBe(200);
  const { entries } = await logRes.json();
  return entries[0];
}

test.describe("Cluster 11 - Security Hardening und Fail-Closed", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await setMockMode(request, true);
    await setFaultInjection(request, "none");
    await seedGroupMapping(request, "internal_standard", INTERNAL_STANDARD_GROUP_ID);
    await seedGroupMapping(request, "executive", EXECUTIVE_GROUP_ID);
  });

  test.afterAll(async ({ request }) => {
    await setMockMode(request, false);
    await setFaultInjection(request, "none");
  });

  test("a draft page (never published) is blocked from Graph sync", async ({ request }) => {
    const { node } = await createNodeWithWorkingCopy(
      request,
      `C11 Draft Page ${Date.now()}`,
    );

    const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("a page with only an unpublished working copy (no published revision yet) is blocked", async ({
    request,
  }) => {
    const { node, workingCopyId } = await createNodeWithWorkingCopy(
      request,
      `C11 Working Copy Page ${Date.now()}`,
    );
    await fillWorkingCopy(request, workingCopyId, `C11 Working Copy Page ${Date.now()}`);
    // submitted/in-review, but never approved+published
    await request.post(`${API}/content/working-copies/${workingCopyId}/submit`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { comment: "e2e" },
    });

    const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("a page without a resolvable ACL (no Entra group mapping) is blocked, never defaults to everyone", async ({
    request,
  }) => {
    await deleteGroupMapping(request, "internal_standard");
    try {
      const node = await createPublishedPage(request, `C11 No ACL Page ${Date.now()}`);

      const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { dryRun: false },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(body.details?.reason).toContain("missing_group_mapping");

      const entry = await getLatestLogEntry(
        request,
        `flowcore_page_pending_${node.id}`,
      );
      expect(entry.result).toBe("failed");
      expect(entry.reason).toBeTruthy();
    } finally {
      await seedGroupMapping(request, "internal_standard", INTERNAL_STANDARD_GROUP_ID);
    }
  });

  test("a restricted (confidential) page with no principal mapped to Entra is blocked, never defaults to everyone", async ({
    request,
  }) => {
    await withAllConfidentialAllowedRolePrincipalsTemporarilyUnmapped(async () => {
      const node = await createPublishedPage(request, `C11 Restricted No Mapping ${Date.now()}`, {
        confidentiality: "confidential",
      });
      // Remove direct ownership so the only route into the confidential ACL
      // is via the confidentiality allowed_roles grant (system_admin), and
      // that admin's Entra identity has been stripped above - so the ACL
      // resolves to an authorized-but-unmapped principal, never to
      // "everyone".
      await clearNodeOwnerForAclTest(node.id);

      const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { dryRun: false },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(
        body.details?.reason === "no_authorized_principals" ||
          body.details?.reason === "no_entra_mapping",
      ).toBe(true);

      const entry = await getLatestLogEntry(request, `flowcore_page_pending_${node.id}`);
      expect(entry.result).toBe("failed");
      expect(entry.reason).toBeTruthy();
    });
  });

  test("a missing Graph secret/token blocks sync and is recorded as a failure, never a silent success", async ({
    request,
  }) => {
    await setFaultInjection(request, "auth_unconfigured");
    try {
      const node = await createPublishedPage(request, `C11 Missing Secret Page ${Date.now()}`);

      const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { dryRun: false },
      });
      expect(res.status()).toBeGreaterThanOrEqual(500);
      const body = await res.json();
      expect(body.error).toBeTruthy();

      const entry = await getLatestLogEntry(request, `flowcore_page_${node.immutableId}`);
      expect(entry.result).toBe("failed");
      expect(entry.reason).toBeTruthy();
      expect(entry.actor).toBeTruthy();
      expect(entry.graphConnectionId === null || typeof entry.graphConnectionId === "string").toBe(
        true,
      );
    } finally {
      await setFaultInjection(request, "none");
    }
  });

  test("a Microsoft Graph API error is recorded as failed, never marked as success", async ({
    request,
  }) => {
    await setFaultInjection(request, "api_error");
    try {
      const node = await createPublishedPage(request, `C11 Graph API Error Page ${Date.now()}`);

      const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
        headers: { "X-Dev-Principal-Id": ADMIN_A },
        data: { dryRun: false },
      });
      expect(res.status()).toBeGreaterThanOrEqual(500);

      const entry = await getLatestLogEntry(request, `flowcore_page_${node.immutableId}`);
      expect(entry.result).toBe("failed");
      expect(entry.reason).toBeTruthy();
      expect(entry.graphResponseCode).toBe(500);
    } finally {
      await setFaultInjection(request, "none");
    }
  });

  test("archiving a previously-synced page triggers a Graph delete/deindex, with full audit fields", async ({
    request,
  }) => {
    const title = `C11 Archive Deindex Page ${Date.now()}`;
    const node = await createPublishedPage(request, title);
    const syncRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect((await syncRes.json()).status).toBe("success");

    const archiveRes = await request.delete(`${API}/content/nodes/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    expect(archiveRes.status()).toBeLessThan(300);

    const fullRes = await request.post(`${API}/graph-connector/sync/full`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(fullRes.status()).toBe(200);

    const entry = await getLatestLogEntry(request, `flowcore_page_${node.immutableId}`);
    expect(entry.operation).toBe("delete");
    expect(entry.result).toBe("success");
    for (const field of ["itemId", "itemType", "actor", "createdAt"]) {
      expect(entry[field]).toBeTruthy();
    }
  });

  test("turning agent_enabled off triggers a Graph delete/deindex for a previously-synced page", async ({
    request,
  }) => {
    const title = `C11 AgentDisabled Deindex Page ${Date.now()}`;
    const { node, workingCopyId } = await createNodeWithWorkingCopy(request, title);
    await fillWorkingCopy(request, workingCopyId, title);
    await publishWorkingCopy(request, workingCopyId);

    const syncRes = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect((await syncRes.json()).status).toBe("success");

    const wcRes = await request.post(`${API}/content/nodes/${node.id}/working-copies`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
    });
    const wc = await wcRes.json();
    await fillWorkingCopy(request, wc.id, title, { agent_enabled: false });
    await publishWorkingCopy(request, wc.id);

    const fullRes = await request.post(`${API}/graph-connector/sync/full`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(fullRes.status()).toBe(200);
    const summary = await fullRes.json();
    expect(summary.deindexed).toBeGreaterThanOrEqual(1);

    const entry = await getLatestLogEntry(request, `flowcore_page_${node.immutableId}`);
    expect(entry.operation).toBe("delete");
    expect(entry.result).toBe("success");
  });

  test("a successful sync writes a complete audit log entry (timestamp, actor, nodeId, itemType, action, version/revision, hashes, connection, response code, result)", async ({
    request,
  }) => {
    const title = `C11 Full Audit Fields Page ${Date.now()}`;
    const node = await createPublishedPage(request, title);

    const res = await request.post(`${API}/graph-connector/sync/pages/${node.id}`, {
      headers: { "X-Dev-Principal-Id": ADMIN_A },
      data: { dryRun: false },
    });
    expect(res.status()).toBe(200);

    const entry = await getLatestLogEntry(request, `flowcore_page_${node.immutableId}`);
    expect(entry.result).toBe("success");
    expect(entry.createdAt).toBeTruthy();
    expect(entry.actor).toBeTruthy();
    expect(entry.nodeId).toBe(node.id);
    expect(entry.itemType).toBe("page");
    expect(entry.operation).toBeTruthy();
    expect(entry.version).toBeTruthy();
    expect(typeof entry.revision === "number").toBe(true);
    expect(entry.contentHash).toBeTruthy();
    expect(entry.aclHash).toBeTruthy();
    expect(entry.graphResponseCode).toBe(200);
  });
});

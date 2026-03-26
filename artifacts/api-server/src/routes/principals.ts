import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  listPrincipals,
  searchPrincipals,
  getPrincipalById,
  assignRole,
  getRolesForPrincipal,
  revokeRole,
} from "../services/principal.service";
import {
  grantPagePermission,
  revokePagePermission,
  getPagePermissions,
  setNodeOwnership,
  getNodeOwnership,
  getRolePermissionMatrix,
  getEffectivePermissions,
  type WikiPermission,
} from "../services/rbac.service";
import { searchPeople, searchGroups, getPersonPhoto } from "../services/graph-client.service";
import { db } from "@workspace/db";
import { auditEventsTable } from "@workspace/db/schema";

const router = Router();

router.get(
  "/principals",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const q = req.query.q as string | undefined;
    let principals;
    if (q) {
      principals = await searchPrincipals(q);
    } else {
      const limit = parseInt((req.query.limit as string) ?? "50", 10);
      const offset = parseInt((req.query.offset as string) ?? "0", 10);
      principals = await listPrincipals(limit, offset);
    }
    const withRoles = await Promise.all(
      principals.map(async (p) => {
        const roles = await getRolesForPrincipal(p.id);
        return { ...p, roles };
      }),
    );
    res.json(withRoles);
  },
);

router.post(
  "/principals",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const { externalId, principalType, displayName, email, upn } = req.body ?? {};

    if (
      typeof externalId !== "string" || externalId.trim().length === 0 ||
      typeof displayName !== "string" || displayName.trim().length === 0
    ) {
      res.status(400).json({ error: "Missing required fields: externalId, displayName" });
      return;
    }

    const validTypes = ["user", "group"] as const;
    if (!validTypes.includes(principalType)) {
      res.status(400).json({ error: `principalType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    if (email !== undefined && email !== null && typeof email !== "string") {
      res.status(400).json({ error: "email must be a string or null" });
      return;
    }

    if (upn !== undefined && upn !== null && typeof upn !== "string") {
      res.status(400).json({ error: "upn must be a string or null" });
      return;
    }

    const { upsertPrincipal: upsert } = await import("../services/principal.service");
    const principalId = await upsert({
      principalType: principalType as "user" | "group",
      externalProvider: "entra",
      externalId: externalId.trim(),
      displayName: displayName.trim(),
      email: typeof email === "string" ? email.trim() : undefined,
      upn: typeof upn === "string" ? upn.trim() : undefined,
    });

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "principal_created",
      actorId: req.user!.principalId,
      resourceType: "principal",
      resourceId: principalId,
      details: { externalId, principalType, displayName },
    });

    const principal = await getPrincipalById(principalId);
    res.status(201).json(principal);
  },
);

router.get("/principals/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const isSelf = req.user!.principalId === id;
  if (!isSelf) {
    const perms = await getEffectivePermissions(req.user!.principalId);
    if (!perms.has("manage_permissions")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const principal = await getPrincipalById(id);
  if (!principal) {
    res.status(404).json({ error: "Principal not found" });
    return;
  }
  const roles = await getRolesForPrincipal(id);
  res.json({ ...principal, roles });
});

router.get("/principals/:id/permissions", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const isSelf = req.user!.principalId === id;
  if (!isSelf) {
    const callerPerms = await getEffectivePermissions(req.user!.principalId);
    if (!callerPerms.has("manage_permissions")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const permissions = await getEffectivePermissions(
    id,
    req.query.nodeId as string | undefined,
  );
  res.json({
    principalId: id,
    permissions: Array.from(permissions) as WikiPermission[],
  });
});

router.post(
  "/principals/:id/roles",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const id = req.params.id as string;
    const assignmentId = await assignRole({
      principalId: id,
      role: req.body.role,
      scope: req.body.scope,
      grantedBy: req.user!.principalId,
    });

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "role_assigned",
      actorId: req.user!.principalId,
      resourceType: "principal",
      resourceId: id,
      details: { role: req.body.role, scope: req.body.scope },
    });

    res.status(201).json({ assignmentId });
  },
);

router.delete(
  "/principals/:id/roles/:assignmentId",
  requireAuth,
  requirePermission("manage_permissions"),
  async (req, res) => {
    const assignmentId = req.params.assignmentId as string;
    await revokeRole(assignmentId);

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "role_revoked",
      actorId: req.user!.principalId,
      resourceType: "role_assignment",
      resourceId: assignmentId,
    });

    res.status(204).send();
  },
);

router.get("/rbac/matrix", requireAuth, (_req, res) => {
  res.json(getRolePermissionMatrix());
});

router.get("/graph/photo/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId as string;
  const sizeParam = req.query.size;
  const size = typeof sizeParam === "string" ? sizeParam : "48x48";
  const accessToken = (req.session?.graphAccessToken as string) ?? "";
  const photo = await getPersonPhoto(accessToken, userId, size);
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.set("Content-Type", "image/jpeg");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(photo);
});

router.get("/graph/people", requireAuth, requirePermission("manage_permissions"), async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const accessToken = req.session?.graphAccessToken ?? "";
  const results = await searchPeople(accessToken, q);
  res.json(results);
});

router.get("/graph/groups", requireAuth, requirePermission("manage_permissions"), async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const accessToken = req.session?.graphAccessToken ?? "";
  const results = await searchGroups(accessToken, q);
  res.json(results);
});

router.get(
  "/content/nodes/:nodeId/permissions",
  requireAuth,
  requirePermission("manage_permissions", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const perms = await getPagePermissions(nodeId);
    res.json(perms);
  },
);

router.post(
  "/content/nodes/:nodeId/permissions",
  requireAuth,
  requirePermission("manage_permissions", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const id = await grantPagePermission({
      nodeId,
      principalId: req.body.principalId,
      permission: req.body.permission,
      grantedBy: req.user!.principalId,
    });

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "page_permission_granted",
      actorId: req.user!.principalId,
      resourceType: "content_node",
      resourceId: nodeId,
      details: {
        principalId: req.body.principalId,
        permission: req.body.permission,
      },
    });

    res.status(201).json({ id });
  },
);

router.delete(
  "/content/nodes/:nodeId/permissions/:permId",
  requireAuth,
  requirePermission("manage_permissions", (req) => req.params.nodeId),
  async (req, res) => {
    const permId = req.params.permId as string;
    await revokePagePermission(permId);

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "page_permission_revoked",
      actorId: req.user!.principalId,
      resourceType: "page_permission",
      resourceId: permId,
    });

    res.status(204).send();
  },
);

router.get(
  "/content/nodes/:nodeId/ownership",
  requireAuth,
  requirePermission("read_page", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const ownership = await getNodeOwnership(nodeId);
    res.json(ownership);
  },
);

router.put(
  "/content/nodes/:nodeId/ownership",
  requireAuth,
  requirePermission("manage_permissions", (req) => req.params.nodeId),
  async (req, res) => {
    const nodeId = req.params.nodeId as string;
    const id = await setNodeOwnership({
      nodeId,
      ownerId: req.body.ownerId,
      deputyId: req.body.deputyId,
      reviewerId: req.body.reviewerId,
      approverId: req.body.approverId,
    });

    await db.insert(auditEventsTable).values({
      eventType: "rbac",
      action: "ownership_updated",
      actorId: req.user!.principalId,
      resourceType: "content_node",
      resourceId: nodeId,
      details: {
        ownerId: req.body.ownerId,
        deputyId: req.body.deputyId,
      },
    });

    res.json({ id });
  },
);

export default router;

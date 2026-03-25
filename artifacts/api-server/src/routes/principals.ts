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
import { searchPeople, searchGroups } from "../services/graph-client.service";
import { db } from "@workspace/db";
import { auditEventsTable } from "@workspace/db/schema";

const router = Router();

router.get("/principals", requireAuth, async (req, res) => {
  const q = req.query.q as string | undefined;
  if (q) {
    const results = await searchPrincipals(q);
    res.json(results);
    return;
  }
  const limit = parseInt((req.query.limit as string) ?? "50", 10);
  const offset = parseInt((req.query.offset as string) ?? "0", 10);
  const results = await listPrincipals(limit, offset);
  res.json(results);
});

router.get("/principals/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
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

router.get("/graph/people", requireAuth, async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const results = await searchPeople("", q);
  res.json(results);
});

router.get("/graph/groups", requireAuth, async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const results = await searchGroups("", q);
  res.json(results);
});

router.get(
  "/content/nodes/:nodeId/permissions",
  requireAuth,
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

import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requirePermission } from "../middlewares/require-permission";
import {
  listWorkflowTemplates,
  getWorkflowTemplate,
  createWorkflowTemplate,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  listPageTypeAssignments,
  upsertPageTypeAssignment,
  removePageTypeAssignment,
  listNotificationRules,
  upsertNotificationRule,
  deleteNotificationRule,
  seedNotificationRules,
  getSystemSetting,
  setSystemSetting,
} from "../services/workflow.service";
import { getAppAccessToken } from "../services/auth.service";
import { logger } from "../lib/logger";

export const workflowsAdminRouter = Router();

const auth = [requireAuth, requirePermission("manage_workflows")];

workflowsAdminRouter.get("/admin/workflows", ...auth, async (_req, res) => {
  try {
    const templates = await listWorkflowTemplates();
    res.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.get("/admin/workflows/:id", ...auth, async (req, res) => {
  try {
    const template = await getWorkflowTemplate(req.params.id as string);
    if (!template) {
      res.status(404).json({ error: "Workflow-Template nicht gefunden" });
      return;
    }
    res.json(template);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.post("/admin/workflows", ...auth, async (req, res) => {
  try {
    const { name, description, isDefault, isActive, enforceSoD, steps } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name ist ein Pflichtfeld" });
      return;
    }
    const template = await createWorkflowTemplate({
      name,
      description,
      isDefault: isDefault ?? false,
      isActive: isActive ?? true,
      enforceSoD: enforceSoD ?? false,
      createdBy: req.user?.displayName || "system",
      steps: steps ?? [],
    });
    res.status(201).json(template);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.put("/admin/workflows/:id", ...auth, async (req, res) => {
  try {
    const { name, description, isDefault, isActive, enforceSoD, steps } = req.body;
    const updated = await updateWorkflowTemplate(req.params.id as string, {
      name,
      description,
      isDefault,
      isActive,
      enforceSoD,
      steps,
    });
    if (!updated) {
      res.status(404).json({ error: "Workflow-Template nicht gefunden" });
      return;
    }
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.delete("/admin/workflows/:id", ...auth, async (req, res) => {
  try {
    const deleted = await deleteWorkflowTemplate(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: "Workflow-Template nicht gefunden" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Der Standard-Workflow kann nicht gelöscht werden." ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

workflowsAdminRouter.get("/admin/workflow-assignments", ...auth, async (_req, res) => {
  try {
    const assignments = await listPageTypeAssignments();
    res.json({ assignments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.put("/admin/workflow-assignments/:pageType", ...auth, async (req, res) => {
  try {
    const { workflowId } = req.body;
    if (!workflowId) {
      res.status(400).json({ error: "workflowId ist ein Pflichtfeld" });
      return;
    }
    const assignment = await upsertPageTypeAssignment(
      req.params.pageType as string,
      workflowId,
    );
    res.json(assignment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.delete("/admin/workflow-assignments/:pageType", ...auth, async (req, res) => {
  try {
    await removePageTypeAssignment(req.params.pageType as string);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.get("/admin/notification-rules", ...auth, async (_req, res) => {
  try {
    const rules = await listNotificationRules();
    res.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.post("/admin/notification-rules/seed", ...auth, async (_req, res) => {
  try {
    const result = await seedNotificationRules();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.put("/admin/notification-rules/:id", ...auth, async (req, res) => {
  try {
    const { recipientTypes, channels, reminderAfterDays, escalationAfterDays, isEnabled } = req.body;
    const rule = await upsertNotificationRule({
      id: req.params.id as string,
      eventType: "",
      recipientTypes: recipientTypes ?? [],
      channels: channels ?? ["in_app"],
      reminderAfterDays: reminderAfterDays ?? null,
      escalationAfterDays: escalationAfterDays ?? null,
      isEnabled: isEnabled ?? true,
    });
    res.json(rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.post("/admin/notification-rules", ...auth, async (req, res) => {
  try {
    const { eventType, recipientTypes, channels, reminderAfterDays, escalationAfterDays, isEnabled } = req.body;
    if (!eventType) {
      res.status(400).json({ error: "eventType ist ein Pflichtfeld" });
      return;
    }
    const rule = await upsertNotificationRule({
      eventType,
      recipientTypes: recipientTypes ?? [],
      channels: channels ?? ["in_app"],
      reminderAfterDays: reminderAfterDays ?? null,
      escalationAfterDays: escalationAfterDays ?? null,
      isEnabled: isEnabled ?? true,
    });
    res.status(201).json(rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.delete("/admin/notification-rules/:id", ...auth, async (req, res) => {
  try {
    const deleted = await deleteNotificationRule(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: "Benachrichtigungsregel nicht gefunden" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.get("/admin/flowcore-account", ...auth, async (_req, res) => {
  try {
    const upn = await getSystemSetting("flowcore_account_upn");
    res.json({ upn: upn ?? "flowcore@bildungscampus-backnang.de" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.put("/admin/flowcore-account", ...auth, async (req, res) => {
  try {
    const { upn } = req.body;
    if (!upn || typeof upn !== "string") {
      res.status(400).json({ error: "UPN/E-Mail ist ein Pflichtfeld" });
      return;
    }
    await setSystemSetting("flowcore_account_upn", upn, req.user?.displayName);
    res.json({ upn });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

workflowsAdminRouter.post("/admin/flowcore-account/test", ...auth, async (req, res) => {
  try {
    const { upn } = req.body;
    const targetUpn = upn ?? (await getSystemSetting("flowcore_account_upn")) ?? "";

    if (!targetUpn) {
      res.json({ success: false, message: "Kein Konto konfiguriert" });
      return;
    }

    let accessToken: string | null = null;
    try {
      accessToken = await getAppAccessToken();
    } catch {
      res.json({ success: false, message: "App-Token konnte nicht abgerufen werden. Prüfen Sie die Entra-Konfiguration." });
      return;
    }

    if (!accessToken) {
      res.json({ success: false, message: "Kein Zugriffstoken verfügbar. Prüfen Sie die Entra-Konfiguration." });
      return;
    }

    const graphRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(targetUpn)}?$select=id,displayName,mail`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!graphRes.ok) {
      const errText = await graphRes.text();
      logger.debug({ status: graphRes.status, errText, targetUpn }, "FlowCore account test failed");
      res.json({
        success: false,
        message: `Konto nicht gefunden oder kein Zugriff (HTTP ${graphRes.status})`,
      });
      return;
    }

    const data = (await graphRes.json()) as { displayName?: string; mail?: string };
    res.json({
      success: true,
      message: `Verbunden: ${data.displayName ?? ""} (${data.mail ?? targetUpn})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

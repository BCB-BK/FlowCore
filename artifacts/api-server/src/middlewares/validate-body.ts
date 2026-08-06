import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validierungsfehler",
        details: formatZodError(parsed.error),
      });
      return;
    }
    // Bewusst zusammenfuehren statt ersetzen: die Spezifikation deckt noch
    // nicht jedes Feld ab. Wuerde hier nur `parsed.data` uebernommen, fielen
    // nicht beschriebene Felder still unter den Tisch -- ein Datenverlust,
    // der erst beim Anwender auffiele. Bekannte Felder gelten geprueft und
    // umgewandelt, unbekannte gehen unveraendert weiter (Audit-Befund B2).
    req.body =
      parsed.data &&
      typeof parsed.data === "object" &&
      !Array.isArray(parsed.data)
        ? { ...(req.body as Record<string, unknown>), ...parsed.data }
        : parsed.data;
    next();
  };
}

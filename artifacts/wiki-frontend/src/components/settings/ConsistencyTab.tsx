import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

interface ConsistencyCheckResult {
  category: string;
  item: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
}

interface ConsistencyReport {
  timestamp: string;
  checks: ConsistencyCheckResult[];
  summary: {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
  };
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ok")
    return <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />;
  if (status === "warning")
    return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
}

function statusVariant(status: string) {
  if (status === "ok") return "default" as const;
  if (status === "warning") return "secondary" as const;
  return "destructive" as const;
}

export function ConsistencyTab() {
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customFetch<ConsistencyReport>(
        "/api/admin/consistency-check",
      );
      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Prüfung fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = report
    ? [...new Set(report.checks.map((c) => c.category))]
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Konsistenzprüfung
              </CardTitle>
              <CardDescription>
                Prüft Übereinstimmung zwischen Code-Schema, Datenbank,
                Konfiguration, Dokumentation und Release-Stand.
              </CardDescription>
            </div>
            <Button onClick={runCheck} disabled={loading} size="sm">
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              {report ? "Erneut prüfen" : "Prüfung starten"}
            </Button>
          </div>
        </CardHeader>
        {error && (
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        )}
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{report.summary.total}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {report.summary.ok}
                </p>
                <p className="text-xs text-muted-foreground">OK</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {report.summary.warnings}
                </p>
                <p className="text-xs text-muted-foreground">Warnungen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {report.summary.errors}
                </p>
                <p className="text-xs text-muted-foreground">Fehler</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Letzte Prüfung: {new Date(report.timestamp).toLocaleString("de-DE")}
          </p>

          {categories.map((cat) => {
            const catChecks = report.checks.filter((c) => c.category === cat);
            const hasIssues = catChecks.some((c) => c.status !== "ok");
            return (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat}
                    {hasIssues ? (
                      <Badge variant="secondary" className="text-xs">
                        {catChecks.filter((c) => c.status !== "ok").length}{" "}
                        Auffälligkeiten
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        Alles OK
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {catChecks.map((check, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 py-1.5 border-b last:border-0"
                      >
                        <StatusIcon status={check.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {check.item}
                            </span>
                            <Badge
                              variant={statusVariant(check.status)}
                              className="text-[10px]"
                            >
                              {check.status === "ok"
                                ? "OK"
                                : check.status === "warning"
                                  ? "Warnung"
                                  : "Fehler"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {check.message}
                          </p>
                          {check.details && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              {check.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {!report && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Klicken Sie auf &quot;Prüfung starten&quot;, um die
            Systemkonsistenz zu prüfen.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ArrowRightLeft,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

interface ProcessOverviewLayoutProps {
  structuredFields: Record<string, unknown>;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessOverviewLayout({
  structuredFields,
}: ProcessOverviewLayoutProps) {
  const sipocData =
    structuredFields.sipoc != null && typeof structuredFields.sipoc === "object"
      ? (structuredFields.sipoc as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      {structuredFields.overview != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Zweck & Geltungsbereich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {str(structuredFields.overview)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            SIPOC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {["Suppliers", "Inputs", "Process", "Outputs", "Customers"].map(
              (col) => (
                <div key={col} className="space-y-1">
                  <Badge
                    variant="outline"
                    className="text-xs w-full justify-center"
                  >
                    {col}
                  </Badge>
                  <div className="min-h-[60px] rounded border border-dashed p-2 text-xs text-muted-foreground text-center">
                    {sipocData && sipocData[col.toLowerCase()]
                      ? str(sipocData[col.toLowerCase()])
                      : "—"}
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              KPIs & Kennzahlen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(structuredFields.kpis) &&
            structuredFields.kpis.length > 0 ? (
              <div className="space-y-2">
                {(
                  structuredFields.kpis as Array<{
                    name?: string;
                    target?: string;
                  }>
                ).map((kpi, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b pb-1 last:border-0"
                  >
                    <span>{kpi.name ?? "—"}</span>
                    <Badge variant="secondary" className="text-xs">
                      {kpi.target ?? "—"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine KPIs definiert
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-600" />
              Normbezug & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {structuredFields.compliance ? (
              <p className="text-sm whitespace-pre-wrap">
                {str(structuredFields.compliance)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Kein Normbezug definiert
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ArrowRightLeft,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { EditableSectionCard } from "./EditableSectionCard";

interface ProcessOverviewLayoutProps {
  structuredFields: Record<string, unknown>;
  onSectionSave?: (key: string, value: string) => void;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcessOverviewLayout({
  structuredFields,
  onSectionSave,
}: ProcessOverviewLayoutProps) {
  const sipocData =
    structuredFields.sipoc != null && typeof structuredFields.sipoc === "object"
      ? (structuredFields.sipoc as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      <EditableSectionCard
        sectionKey="overview"
        label="Zweck & Geltungsbereich"
        icon={<ClipboardList className="h-4 w-4 text-primary" />}
        value={str(structuredFields.overview)}
        onSave={onSectionSave}
      />

      <EditableSectionCard
        sectionKey="sipoc"
        label="SIPOC"
        icon={<ArrowRightLeft className="h-4 w-4 text-blue-600" />}
        value={
          sipocData ? JSON.stringify(sipocData, null, 2) : ""
        }
        onSave={onSectionSave}
        emptyText="Keine SIPOC-Daten definiert"
      >
        {sipocData && (
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
                    {sipocData[col.toLowerCase()]
                      ? str(sipocData[col.toLowerCase()])
                      : "—"}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </EditableSectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableSectionCard
          sectionKey="kpis"
          label="KPIs & Kennzahlen"
          icon={<BarChart3 className="h-4 w-4 text-green-600" />}
          value={
            Array.isArray(structuredFields.kpis)
              ? JSON.stringify(structuredFields.kpis, null, 2)
              : str(structuredFields.kpis)
          }
          onSave={onSectionSave}
          emptyText="Keine KPIs definiert"
        >
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
          ) : undefined}
        </EditableSectionCard>

        <EditableSectionCard
          sectionKey="compliance"
          label="Normbezug & Compliance"
          icon={<ShieldCheck className="h-4 w-4 text-red-600" />}
          value={str(structuredFields.compliance)}
          onSave={onSectionSave}
          emptyText="Kein Normbezug definiert"
        />
      </div>
    </div>
  );
}

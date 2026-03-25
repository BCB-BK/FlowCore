import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, FileStack, BookOpen } from "lucide-react";

interface ProcedureLayoutProps {
  structuredFields: Record<string, unknown>;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function ProcedureLayout({ structuredFields }: ProcedureLayoutProps) {
  return (
    <div className="space-y-4">
      {structuredFields.scope != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Geltungsbereich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {str(structuredFields.scope)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-orange-600" />
            Durchführung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {structuredFields.procedure ? (
            <div className="text-sm whitespace-pre-wrap">
              {str(structuredFields.procedure)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Schritte dokumentiert
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileStack className="h-4 w-4 text-blue-600" />
            Mitgeltende Unterlagen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {structuredFields.documents ? (
            <div className="text-sm whitespace-pre-wrap">
              {str(structuredFields.documents)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine mitgeltenden Unterlagen
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

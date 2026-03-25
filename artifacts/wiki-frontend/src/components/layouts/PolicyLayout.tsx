import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Target, BookOpen, Gavel } from "lucide-react";

interface PolicyLayoutProps {
  structuredFields: Record<string, unknown>;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function PolicyLayout({ structuredFields }: PolicyLayoutProps) {
  return (
    <div className="space-y-4">
      {structuredFields.purpose != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Zweck
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {str(structuredFields.purpose)}
            </p>
          </CardContent>
        </Card>
      )}

      {structuredFields.scope != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
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
            <Shield className="h-4 w-4 text-red-600" />
            Richtlinientext
          </CardTitle>
        </CardHeader>
        <CardContent>
          {structuredFields.policy_text ? (
            <div className="text-sm whitespace-pre-wrap">
              {str(structuredFields.policy_text)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch kein Richtlinientext erfasst
            </p>
          )}
        </CardContent>
      </Card>

      {structuredFields.enforcement != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gavel className="h-4 w-4 text-amber-600" />
              Durchsetzung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {str(structuredFields.enforcement)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

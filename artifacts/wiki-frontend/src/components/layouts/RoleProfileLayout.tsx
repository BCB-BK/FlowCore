import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, ClipboardList, GraduationCap, Key } from "lucide-react";

interface RoleProfileLayoutProps {
  structuredFields: Record<string, unknown>;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function RoleProfileLayout({
  structuredFields,
}: RoleProfileLayoutProps) {
  return (
    <div className="space-y-4">
      {structuredFields.role_definition != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4 text-purple-600" />
              Rollendefinition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {str(structuredFields.role_definition)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Verantwortlichkeiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {structuredFields.responsibilities ? (
            <div className="text-sm whitespace-pre-wrap">
              {str(structuredFields.responsibilities)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Verantwortlichkeiten definiert
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Qualifikationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {structuredFields.qualifications ? (
              <div className="text-sm whitespace-pre-wrap">
                {str(structuredFields.qualifications)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                —
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-600" />
              Befugnisse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {structuredFields.authority ? (
              <div className="text-sm whitespace-pre-wrap">
                {str(structuredFields.authority)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                —
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

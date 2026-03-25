import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPageType } from "@/lib/types";
import { FileText } from "lucide-react";

interface GenericSectionLayoutProps {
  templateType: string;
  structuredFields: Record<string, unknown>;
}

export function GenericSectionLayout({
  templateType,
  structuredFields,
}: GenericSectionLayoutProps) {
  const pageDef = getPageType(templateType);
  if (!pageDef) return null;

  const contentSections = pageDef.sections.filter((s) => s.key !== "children");

  if (contentSections.length === 0) return null;

  return (
    <div className="space-y-4">
      {contentSections.map((section) => (
        <Card key={section.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {section.label}
              {section.required && (
                <span className="text-destructive text-xs">*</span>
              )}
            </CardTitle>
            {section.description && (
              <p className="text-xs text-muted-foreground">
                {section.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {structuredFields[section.key] ? (
              <div className="text-sm whitespace-pre-wrap">
                {typeof structuredFields[section.key] === "object"
                  ? JSON.stringify(structuredFields[section.key], null, 2)
                  : String(structuredFields[section.key])}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch kein Inhalt
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

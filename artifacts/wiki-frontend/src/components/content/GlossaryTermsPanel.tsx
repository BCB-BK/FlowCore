import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Badge } from "@workspace/ui/badge";
import { BookOpen } from "lucide-react";
import { useGetGlossaryTermsByNode } from "@workspace/api-client-react";

interface GlossaryTermsPanelProps {
  nodeId: string;
}

export function GlossaryTermsPanel({ nodeId }: GlossaryTermsPanelProps) {
  const { data: terms } = useGetGlossaryTermsByNode(nodeId);

  if (!Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          Glossarbegriffe ({terms.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {terms.map((term) => (
          <div key={term.id} className="text-sm">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-xs">{term.term}</p>
              {term.abbreviation && (
                <Badge variant="secondary" className="text-[10px]">
                  {term.abbreviation}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {term.definition}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

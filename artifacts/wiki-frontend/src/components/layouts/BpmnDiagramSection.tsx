import { useState } from "react";
import { BpmnEditor, DEFAULT_BPMN_XML } from "@/components/editor/BpmnEditor";
import { Button } from "@workspace/ui/button";
import { GitBranch, Pencil } from "lucide-react";

interface BpmnDiagramData {
  xml: string;
}

function isBpmnData(v: unknown): v is BpmnDiagramData {
  return typeof v === "object" && v !== null && "xml" in v && typeof (v as BpmnDiagramData).xml === "string";
}

interface BpmnDiagramSectionProps {
  data: unknown;
  onSave?: (value: unknown) => void;
  readOnly?: boolean;
}

export function BpmnDiagramSection({ data, onSave, readOnly = false }: BpmnDiagramSectionProps) {
  const [editing, setEditing] = useState(false);

  const xml = isBpmnData(data) ? data.xml : null;
  const hasContent = Boolean(xml);

  function handleSave(newXml: string) {
    onSave?.({ xml: newXml });
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  if (!hasContent && readOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-12 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Kein BPMN-Diagramm vorhanden</p>
      </div>
    );
  }

  if (!hasContent && !readOnly) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-primary/40 bg-muted/20 py-14 text-center">
        <GitBranch className="h-10 w-10 text-primary/50" />
        <div>
          <p className="text-sm font-medium text-foreground">Noch kein BPMN 2.0-Diagramm vorhanden</p>
          <p className="mt-1 text-xs text-muted-foreground">Erstelle ein Prozessdiagramm mit dem BPMN 2.0-Standard</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            onSave?.({ xml: DEFAULT_BPMN_XML });
            setEditing(true);
          }}
        >
          <GitBranch className="mr-2 h-4 w-4" />
          BPMN-Diagramm erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!readOnly && !editing && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Diagramm bearbeiten
          </Button>
        </div>
      )}
      <BpmnEditor
        xml={xml ?? undefined}
        editable={editing}
        height={560}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}

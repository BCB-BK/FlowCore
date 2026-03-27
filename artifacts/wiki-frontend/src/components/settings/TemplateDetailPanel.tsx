import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ListChecks,
  Users,
  ArrowRight,
  Layers,
  Info,
} from "lucide-react";
import type { PageTypeDefinition } from "@workspace/shared/page-types";
import { PAGE_TYPE_LABELS } from "@/lib/types";

const METADATA_GROUP_LABELS: Record<string, string> = {
  identity: "Identifikation",
  governance: "Governance & Verantwortung",
  responsibilities: "Zuständigkeiten",
  validity: "Gültigkeit & Prüfzyklus",
  classification: "Klassifikation & Schlagwörter",
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  date: "Datum",
  person: "Person",
  enum: "Auswahl",
  tags: "Schlagwörter",
  number: "Zahl",
  boolean: "Ja/Nein",
};

interface TemplateDetailPanelProps {
  template: PageTypeDefinition;
}

export function TemplateDetailPanel({ template }: TemplateDetailPanelProps) {
  const groups = template.metadataFields.reduce(
    (acc, f) => {
      (acc[f.group] ??= []).push(f);
      return acc;
    },
    {} as Record<string, typeof template.metadataFields>,
  );

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: template.color }}
          />
          <CardTitle>
            {PAGE_TYPE_LABELS[template.type] || template.labelDe}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {template.descriptionDe}
        </p>
        {template.helpText && (
          <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{template.helpText}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <FileText className="h-4 w-4" />
            Sektionen ({template.sections.length})
          </h4>
          <div className="space-y-1.5">
            {template.sections.map((section) => {
              const req = section.requirement ?? (section.required ? "required" : undefined);
              return (
                <div
                  key={section.key}
                  className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{section.label}</span>
                      {req === "required" && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Pflicht
                        </Badge>
                      )}
                      {req === "recommended" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">
                          Empfohlen
                        </Badge>
                      )}
                      {req === "conditional" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Bedingt
                        </Badge>
                      )}
                      {section.publishRequired && req !== "required" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600">
                          Publish
                        </Badge>
                      )}
                      {section.compoundType && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {section.compoundType}
                        </Badge>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    )}
                    {section.help?.fillHelp && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic">
                        {section.help.fillHelp}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
                    {section.key}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <ListChecks className="h-4 w-4" />
            Metadatenfelder ({template.metadataFields.length})
          </h4>
          <div className="space-y-3">
            {Object.entries(groups).map(([group, fields]) => (
              <div key={group}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {METADATA_GROUP_LABELS[group] || group}
                </p>
                <div className="space-y-1">
                  {fields.map((field) => {
                    const req = field.requirement ?? (field.required ? "required" : undefined);
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded border bg-muted/20 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <span>{field.label}</span>
                          {req === "required" && (
                            <span className="text-destructive text-xs">*</span>
                          )}
                          {req === "recommended" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">Empf.</Badge>
                          )}
                          {req === "conditional" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">Bed.</Badge>
                          )}
                          {field.publishRequired && req !== "required" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-red-50 text-red-600">Pub</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {FIELD_TYPE_LABELS[field.type] || field.type}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {template.allowedChildTypes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Layers className="h-4 w-4" />
                Erlaubte Unterseiten-Typen
              </h4>
              <div className="flex flex-wrap gap-2">
                {template.allowedChildTypes.map((childType) => (
                  <Badge
                    key={childType}
                    variant="secondary"
                    className="text-xs"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    {PAGE_TYPE_LABELS[childType] || childType}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {template.variants.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Users className="h-4 w-4" />
                Varianten ({template.variants.length})
              </h4>
              <div className="space-y-1.5">
                {template.variants.map((variant) => (
                  <div
                    key={variant.key}
                    className="p-2.5 rounded-md border bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {variant.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {variant.key}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {variant.description}
                    </p>
                    {variant.prefilledSections &&
                      variant.prefilledSections.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {variant.prefilledSections.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetadataFieldRenderer } from "./MetadataFieldRenderer";
import {
  getMetadataGroups,
  METADATA_GROUP_LABELS,
  type MetadataGroupKey,
} from "@/lib/types";
import { IdCard, ShieldCheck, Users, CalendarCheck, Tags } from "lucide-react";

const GROUP_ICONS: Record<MetadataGroupKey, React.ReactNode> = {
  identity: <IdCard className="h-4 w-4" />,
  governance: <ShieldCheck className="h-4 w-4" />,
  responsibilities: <Users className="h-4 w-4" />,
  validity: <CalendarCheck className="h-4 w-4" />,
  classification: <Tags className="h-4 w-4" />,
};

interface MetadataPanelProps {
  templateType: string;
  metadata: Record<string, unknown>;
  displayValues?: Record<string, string>;
  onChange: (key: string, value: unknown, displayValue?: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function MetadataPanel({
  templateType,
  metadata,
  displayValues = {},
  onChange,
  readOnly,
  compact,
}: MetadataPanelProps) {
  const groups = getMetadataGroups(templateType);

  const groupEntries = Object.entries(groups).filter(
    ([, fields]) => fields.length > 0,
  ) as [MetadataGroupKey, (typeof groups)[MetadataGroupKey]][];

  if (compact) {
    return (
      <div className="space-y-4">
        {groupEntries.map(([groupKey, fields]) => (
          <div key={groupKey}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              {GROUP_ICONS[groupKey]}
              {METADATA_GROUP_LABELS[groupKey]}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((field) => (
                <MetadataFieldRenderer
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  type={field.type}
                  required={field.required}
                  description={field.description}
                  options={field.options}
                  value={metadata[field.key]}
                  displayValue={displayValues[field.key]}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupEntries.map(([groupKey, fields]) => (
        <Card key={groupKey}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {GROUP_ICONS[groupKey]}
              {METADATA_GROUP_LABELS[groupKey]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <MetadataFieldRenderer
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  type={field.type}
                  required={field.required}
                  description={field.description}
                  options={field.options}
                  value={metadata[field.key]}
                  displayValue={displayValues[field.key]}
                  onChange={onChange}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PeoplePicker } from "@/components/PeoplePicker";
import { X } from "lucide-react";
import { useState } from "react";
import { ENUM_LABELS } from "@/lib/types";

interface MetadataFieldRendererProps {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  options?: string[];
  value: unknown;
  displayValue?: string;
  onChange: (key: string, value: unknown, displayValue?: string) => void;
  readOnly?: boolean;
}

export function MetadataFieldRenderer({
  fieldKey,
  label,
  type,
  required,
  description,
  options,
  value,
  displayValue,
  onChange,
  readOnly,
}: MetadataFieldRendererProps) {
  const [tagInput, setTagInput] = useState("");

  if (type === "person") {
    return (
      <PeoplePicker
        label={label}
        description={description}
        value={value as string | undefined}
        displayValue={displayValue}
        onChange={(id, name) => onChange(fieldKey, id, name)}
        required={required}
      />
    );
  }

  if (type === "enum") {
    const labelMap = ENUM_LABELS[fieldKey] ?? {};
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(fieldKey, v)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Auswählen..." />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {labelMap[opt] ?? opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "tags") {
    const tags = (value as string[]) ?? [];
    const addTag = () => {
      const trimmed = tagInput.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange(fieldKey, [...tags, trimmed]);
        setTagInput("");
      }
    };
    const removeTag = (tag: string) => {
      onChange(
        fieldKey,
        tags.filter((t) => t !== tag),
      );
    };
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {!readOnly && (
          <Input
            placeholder="Schlagwort eingeben + Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
        )}
      </div>
    );
  }

  if (type === "date") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          disabled={readOnly}
        />
      </div>
    );
  }

  if (type === "number") {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(
              fieldKey,
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          disabled={readOnly}
        />
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(fieldKey, e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label className="text-sm">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        disabled={readOnly}
      />
    </div>
  );
}

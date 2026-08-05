import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/card";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import {
  List,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRowKeys } from "./useRowKeys";

function parseAgenda(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  if (raw.trim()) {
    return raw.split("\n").filter((l) => l.trim());
  }
  return [];
}

interface AgendaEditorProps {
  value: string;
  onSave?: (key: string, value: unknown) => void;
  sectionKey: string;
  readOnly?: boolean;
  label?: string;
  icon?: LucideIcon;
  iconColor?: string;
  emptyText?: string;
}

export function AgendaEditor({
  value,
  onSave,
  sectionKey,
  readOnly = false,
  label = "Tagesordnung / Sachstand / Kontext",
  icon: Icon,
  iconColor = "text-blue-600",
  emptyText = "Keine Punkte erfasst",
}: AgendaEditorProps) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<string[]>(() => parseAgenda(value));
  const rowKeys = useRowKeys(items.length);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayItems = parseAgenda(value);
  const isEditable = !readOnly && !!onSave;

  const handleSave = () => {
    onSave?.(sectionKey, JSON.stringify(items.filter((i) => i.trim())));
    setEditing(false);
  };

  const handleCancel = () => {
    setItems(parseAgenda(value));
    setEditing(false);
  };

  const addItem = () => {
    const next = [...items, ""];
    setItems(next);
    rowKeys.add();
    setTimeout(() => {
      inputRefs.current[next.length - 1]?.focus();
    }, 30);
  };

  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
    rowKeys.remove(i);
  };

  const updateItem = (i: number, val: string) => {
    setItems(items.map((item, idx) => (idx === i ? val : item)));
  };

  const moveItem = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    rowKeys.move(i, j);
  };

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...items.slice(0, i + 1), "", ...items.slice(i + 1)];
      setItems(next);
      rowKeys.insertAt(i + 1);
      setTimeout(() => {
        inputRefs.current[i + 1]?.focus();
      }, 30);
    } else if (e.key === "Backspace" && items[i] === "" && items.length > 1) {
      e.preventDefault();
      removeItem(i);
      setTimeout(() => {
        inputRefs.current[Math.max(0, i - 1)]?.focus();
      }, 30);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {Icon ? (
              <Icon className={`h-4 w-4 ${iconColor}`} />
            ) : (
              <List className={`h-4 w-4 ${iconColor}`} />
            )}
            {label}
            {displayItems.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({displayItems.length}{" "}
                {displayItems.length === 1 ? "Punkt" : "Punkte"})
              </span>
            )}
          </CardTitle>
          {isEditable && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setItems(parseAgenda(value));
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Bearbeiten
            </Button>
          )}
          {editing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Abbrechen
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSave}
              >
                <Check className="h-3 w-3 mr-1" />
                Speichern
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={rowKeys.keys[i]} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0 font-mono">
                  {i + 1}.
                </span>
                <Input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder={`Punkt ${i + 1}`}
                  className="h-8 text-sm flex-1"
                />
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    className="h-4 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === items.length - 1}
                    className="h-4 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={addItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Punkt hinzufügen
            </Button>
          </div>
        ) : displayItems.length > 0 ? (
          <ol className="space-y-1.5 list-none">
            {displayItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-mono text-muted-foreground pt-0.5 w-5 text-right shrink-0">
                  {i + 1}.
                </span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

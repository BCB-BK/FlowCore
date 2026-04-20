import { useState } from "react";

interface TableSizePickerProps {
  onPick: (rows: number, cols: number, withHeader: boolean) => void;
  maxRows?: number;
  maxCols?: number;
}

export function TableSizePicker({
  onPick,
  maxRows = 8,
  maxCols = 8,
}: TableSizePickerProps) {
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [withHeader, setWithHeader] = useState(true);

  return (
    <div className="p-2 select-none">
      <div className="text-xs text-muted-foreground mb-1.5 px-1">
        {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Größe wählen"}
      </div>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 16px)` }}
        onMouseLeave={() => setHover({ r: 0, c: 0 })}
      >
        {Array.from({ length: maxRows * maxCols }).map((_, idx) => {
          const r = Math.floor(idx / maxCols) + 1;
          const c = (idx % maxCols) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button
              key={idx}
              type="button"
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c, withHeader)}
              className={`h-4 w-4 border rounded-sm transition-colors ${
                active
                  ? "bg-primary border-primary"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            />
          );
        })}
      </div>
      <label className="flex items-center gap-1.5 mt-2 px-1 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={withHeader}
          onChange={(e) => setWithHeader(e.target.checked)}
          className="h-3 w-3"
        />
        <span>Mit Kopfzeile</span>
      </label>
    </div>
  );
}

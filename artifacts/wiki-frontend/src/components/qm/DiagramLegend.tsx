import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface LegendItem {
  label: string;
  description?: string;
  svg: React.ReactNode;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    label: "Start-Ereignis",
    description: "Prozessbeginn",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="#6dd97b" stroke="#22863a" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "End-Ereignis",
    description: "Prozessende",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="9" fill="#f87171" stroke="#b91c1c" strokeWidth="3" />
      </svg>
    ),
  },
  {
    label: "Aufgabe / Task",
    description: "Aktion oder Aktivit\u00E4t",
    svg: (
      <svg width="38" height="28" viewBox="0 0 38 28">
        <rect x="2" y="4" width="34" height="20" rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "XOR-Gateway",
    description: "Entscheidung (entweder/oder)",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <polygon points="14,2 26,14 14,26 2,14" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
        <line x1="9" y1="9" x2="19" y2="19" stroke="#ca8a04" strokeWidth="2" />
        <line x1="19" y1="9" x2="9" y2="19" stroke="#ca8a04" strokeWidth="2" />
      </svg>
    ),
  },
  {
    label: "AND-Gateway",
    description: "Parallelisierung (alle Pfade)",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <polygon points="14,2 26,14 14,26 2,14" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
        <line x1="14" y1="7" x2="14" y2="21" stroke="#16a34a" strokeWidth="2" />
        <line x1="7" y1="14" x2="21" y2="14" stroke="#16a34a" strokeWidth="2" />
      </svg>
    ),
  },
  {
    label: "Swimlane / Pool",
    description: "Verantwortungsbereich",
    svg: (
      <svg width="38" height="28" viewBox="0 0 38 28">
        <rect x="2" y="4" width="34" height="20" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
        <line x1="10" y1="4" x2="10" y2="24" stroke="#64748b" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Sequenzfluss",
    description: "Prozesspfeil / Reihenfolge",
    svg: (
      <svg width="38" height="28" viewBox="0 0 38 28">
        <line x1="4" y1="14" x2="30" y2="14" stroke="#475569" strokeWidth="2" />
        <polygon points="30,10 38,14 30,18" fill="#475569" />
      </svg>
    ),
  },
  {
    label: "Daten-Objekt",
    description: "Dokument oder Daten",
    svg: (
      <svg width="24" height="28" viewBox="0 0 24 28">
        <path
          d="M3 3 L16 3 L21 8 L21 25 L3 25 Z"
          fill="#faf5ff"
          stroke="#7c3aed"
          strokeWidth="1.5"
        />
        <path d="M16 3 L16 8 L21 8" fill="none" stroke="#7c3aed" strokeWidth="1.5" />
      </svg>
    ),
  },
];

interface DiagramLegendProps {
  defaultOpen?: boolean;
  inline?: boolean;
}

function LegendItems() {
  return (
    <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-3 bg-background">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="shrink-0 flex items-center justify-center w-10">
            {item.svg}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium leading-tight">{item.label}</p>
            {item.description && (
              <p className="text-[10px] text-muted-foreground leading-tight">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiagramLegend({ defaultOpen = false, inline = false }: DiagramLegendProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (inline) {
    return <LegendItems />;
  }

  return (
    <div className="mt-3 border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <span className="text-xs font-medium text-muted-foreground">Legende &amp; Symbole</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 bg-background">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="shrink-0 flex items-center justify-center w-10">
                {item.svg}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-tight">{item.label}</p>
                {item.description && (
                  <p className="text-[10px] text-muted-foreground leading-tight">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Hash, Clock, Calendar, User, ShieldCheck } from "lucide-react";

interface QuickFactsStripProps {
  displayCode: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
  nextReviewDate?: string;
}

export function QuickFactsStrip({
  displayCode,
  createdAt,
  updatedAt,
  ownerName,
  nextReviewDate,
}: QuickFactsStripProps) {
  const facts: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (displayCode) {
    facts.push({
      icon: <Hash className="h-3 w-3" />,
      label: "ID",
      value: displayCode,
    });
  }

  if (ownerName) {
    facts.push({
      icon: <User className="h-3 w-3" />,
      label: "Verantwortlich",
      value: ownerName,
    });
  }

  facts.push({
    icon: <Clock className="h-3 w-3" />,
    label: "Erstellt",
    value: new Date(createdAt).toLocaleDateString("de-DE"),
  });

  facts.push({
    icon: <Calendar className="h-3 w-3" />,
    label: "Aktualisiert",
    value: new Date(updatedAt).toLocaleDateString("de-DE"),
  });

  if (nextReviewDate) {
    facts.push({
      icon: <ShieldCheck className="h-3 w-3" />,
      label: "Nächste Prüfung",
      value: new Date(nextReviewDate).toLocaleDateString("de-DE"),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-md bg-muted/50 border text-xs text-muted-foreground">
      {facts.map((fact, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {fact.icon}
          <span>{fact.label}:</span>
          <span className="font-medium text-foreground">{fact.value}</span>
        </div>
      ))}
    </div>
  );
}

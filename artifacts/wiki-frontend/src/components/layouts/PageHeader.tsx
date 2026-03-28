import { Badge } from "@workspace/ui/badge";
import { PAGE_TYPE_LABELS, getPageType } from "@/lib/types";
import { PageTypeIcon } from "@/components/PageTypeIcon";
import { StatusBadge } from "@/components/versioning/StatusBadge";
import { CompletenessIndicator } from "@/components/metadata/CompletenessIndicator";

interface PageHeaderProps {
  title: string;
  displayCode: string | null;
  templateType: string;
  status: string;
  metadata: Record<string, unknown>;
  structuredFields: Record<string, unknown>;
  nextReviewDate?: string;
  ownerId?: string | null;
}

export function PageHeader({
  title,
  displayCode,
  templateType,
  status,
  metadata,
  structuredFields,
  nextReviewDate,
  ownerId,
}: PageHeaderProps) {
  const pageDef = getPageType(templateType);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {pageDef && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-white shrink-0"
            style={{ backgroundColor: pageDef.color }}
          >
            <PageTypeIcon iconName={pageDef.icon} className="h-3.5 w-3.5" />
          </div>
        )}
        <StatusBadge
          status={status as Parameters<typeof StatusBadge>[0]["status"]}
          nextReviewDate={nextReviewDate}
          ownerId={ownerId}
        />
        <Badge variant="secondary">
          {PAGE_TYPE_LABELS[templateType] || templateType}
        </Badge>
        <CompletenessIndicator
          templateType={templateType}
          metadata={metadata}
          sectionData={structuredFields}
          compact
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {displayCode && (
        <p className="text-sm text-muted-foreground">{displayCode}</p>
      )}
    </div>
  );
}

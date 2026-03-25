import {
  Workflow,
  Building2,
  FileText,
  GitBranchPlus,
  ListChecks,
  Users,
  Shield,
  UserCog,
  LayoutDashboard,
  Server,
  File,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Workflow,
  Building2,
  FileText,
  GitBranchPlus,
  ListChecks,
  Users,
  Shield,
  UserCog,
  LayoutDashboard,
  Server,
};

interface PageTypeIconProps {
  iconName: string;
  className?: string;
}

export function PageTypeIcon({ iconName, className }: PageTypeIconProps) {
  const Icon = ICON_MAP[iconName] ?? File;
  return <Icon className={className} />;
}

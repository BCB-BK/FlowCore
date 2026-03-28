import { useState } from "react";
import { useTeamsContext } from "@/hooks/useTeamsContext";
import { buildPageDeepLink, getTeamsAppId } from "@/lib/teams";
import { Button } from "@workspace/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/dropdown-menu";
import { Share2, Copy, ExternalLink, Check } from "lucide-react";

interface ShareToTeamsProps {
  nodeId: string;
  pageTitle: string;
  displayCode?: string;
}

export function ShareToTeams({
  nodeId,
  pageTitle,
  displayCode,
}: ShareToTeamsProps) {
  const { inTeams } = useTeamsContext();
  const [copied, setCopied] = useState(false);

  const appId = getTeamsAppId();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const webUrl = `${window.location.origin}${basePath}/node/${nodeId}`;
  const teamsDeepLink = appId
    ? buildPageDeepLink(appId, nodeId, pageTitle)
    : webUrl;

  const label = displayCode ? `${displayCode}: ${pageTitle}` : pageTitle;

  const handleCopyLink = async () => {
    const link = inTeams ? teamsDeepLink : webUrl;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInBrowser = () => {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareToTeamsChat = () => {
    const shareUrl = `https://teams.microsoft.com/share?msgText=${encodeURIComponent(label)}&href=${encodeURIComponent(teamsDeepLink)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Teilen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-600" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Link kopieren
        </DropdownMenuItem>
        {appId && (
          <DropdownMenuItem onClick={handleShareToTeamsChat}>
            <Share2 className="mr-2 h-4 w-4" />
            In Teams teilen
          </DropdownMenuItem>
        )}
        {inTeams && (
          <DropdownMenuItem onClick={handleOpenInBrowser}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Im Browser öffnen
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

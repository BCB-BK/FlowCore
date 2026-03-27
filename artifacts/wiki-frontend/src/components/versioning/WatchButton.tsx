import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";

interface WatchStatus {
  watching: boolean;
}

interface WatchButtonProps {
  nodeId: string;
}

export function WatchButton({ nodeId }: WatchButtonProps) {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL + "api";

  const fetchStatus = useCallback(async () => {
    try {
      const data = await customFetch<WatchStatus>(
        `${apiBase}/content/nodes/${nodeId}/watch`,
      );
      setWatching(data.watching);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [apiBase, nodeId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const toggleWatch = useCallback(async () => {
    setLoading(true);
    try {
      if (watching) {
        await customFetch(`${apiBase}/content/nodes/${nodeId}/watch`, {
          method: "DELETE",
          responseType: "text",
        });
        setWatching(false);
        toast({ title: "Seite wird nicht mehr beobachtet" });
      } else {
        await customFetch(`${apiBase}/content/nodes/${nodeId}/watch`, {
          method: "POST",
          body: JSON.stringify({ watchChildren: false }),
        });
        setWatching(true);
        toast({ title: "Seite wird beobachtet" });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Fehler beim Ändern des Beobachtungsstatus",
      });
    } finally {
      setLoading(false);
    }
  }, [watching, apiBase, nodeId, toast]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleWatch}
      disabled={loading}
      className="gap-1.5 min-w-[150px]"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : watching ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {watching ? "Nicht beobachten" : "Beobachten"}
    </Button>
  );
}

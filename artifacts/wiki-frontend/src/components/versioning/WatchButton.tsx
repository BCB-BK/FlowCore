import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      const res = await fetch(`${apiBase}/content/nodes/${nodeId}/watch`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { watching: boolean };
        setWatching(data.watching);
      }
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
        const res = await fetch(`${apiBase}/content/nodes/${nodeId}/watch`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("unwatch failed");
        setWatching(false);
        toast({ title: "Seite wird nicht mehr beobachtet" });
      } else {
        const res = await fetch(`${apiBase}/content/nodes/${nodeId}/watch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchChildren: false }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("watch failed");
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
      className="gap-1.5"
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

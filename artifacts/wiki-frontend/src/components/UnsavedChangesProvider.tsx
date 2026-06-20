import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { UnsavedChangesContext } from "@/hooks/use-unsaved-changes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@workspace/ui/dialog";
import { Button } from "@workspace/ui/button";
import { AlertTriangle } from "lucide-react";

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingCallbackRef = useRef<(() => void) | null>(null);
  const [, navigate] = useLocation();

  const setDirty = useCallback((value: boolean) => {
    setIsDirty(value);
    isDirtyRef.current = value;
  }, []);

  const openDialog = useCallback((onConfirm: () => void) => {
    pendingCallbackRef.current = onConfirm;
    setDialogOpen(true);
  }, []);

  /**
   * Führt callback sofort aus wenn nicht dirty.
   * Zeigt Bestätigungs-Dialog wenn dirty – callback wird nur ausgeführt wenn bestätigt.
   */
  const confirmLeave = useCallback(
    (callback: () => void) => {
      if (!isDirtyRef.current) {
        callback();
        return;
      }
      openDialog(callback);
    },
    [openDialog],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      if (anchor.getAttribute("target")) return;

      e.preventDefault();
      e.stopPropagation();

      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const path = base && href.startsWith(base) ? href.slice(base.length) : href;

      openDialog(() => {
        navigate(path || "/");
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [navigate, openDialog]);

  const handleConfirmLeave = useCallback(() => {
    setDirty(false);
    setDialogOpen(false);
    const cb = pendingCallbackRef.current;
    pendingCallbackRef.current = null;
    cb?.();
  }, [setDirty]);

  const handleCancelLeave = useCallback(() => {
    setDialogOpen(false);
    pendingCallbackRef.current = null;
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, confirmLeave }}>
      {children}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCancelLeave(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-base">Ungespeicherte Änderungen</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Wenn Sie die Seite jetzt verlassen, werden Ihre nicht gespeicherten Änderungen verworfen und können nicht wiederhergestellt werden.
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelLeave}>
              Weiter bearbeiten
            </Button>
            <Button variant="destructive" onClick={handleConfirmLeave}>
              Seite verlassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

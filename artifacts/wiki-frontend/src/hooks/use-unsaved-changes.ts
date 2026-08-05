import { createContext, useContext, useCallback } from "react";
import type { MouseEvent } from "react";
import { useLocation } from "wouter";

export interface UnsavedChangesContextValue {
  isDirty: boolean;
  setDirty: (value: boolean) => void;
  /** Führt callback sofort aus wenn nicht dirty, sonst zeigt Bestätigungs-Dialog. */
  confirmLeave: (callback: () => void) => void;
}

export const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  isDirty: false,
  setDirty: () => {},
  confirmLeave: (cb) => cb(),
});

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

/**
 * Gibt eine navigate-Funktion zurück, die vor der Navigation prüft ob
 * ungespeicherte Änderungen vorhanden sind (guard via confirmLeave).
 * Ersetzt direktes useLocation()[1] in Navigations-Komponenten.
 */
export function useSafeNavigate() {
  const [, navigate] = useLocation();
  const { confirmLeave } = useContext(UnsavedChangesContext);

  return useCallback(
    (to: string) => {
      confirmLeave(() => navigate(to));
    },
    [navigate, confirmLeave],
  );
}

/**
 * Gibt eine Funktion zurück, die für einen gegebenen Pfad
 * { href, onClick } erzeugt – passend für echte <a>-Elemente.
 *
 * - href: Damit der Browser Mittelklick, Rechtsklick-Kontextmenü
 *         und „In neuem Tab öffnen" nativ unterstützt.
 * - onClick: Fängt normalen Linksklick ab, prüft den Unsaved-Changes-
 *            Guard und navigiert dann via Wouter (SPA-Navigation).
 *            Mittelklick, Ctrl/Meta/Shift/Alt-Klick werden NICHT
 *            abgefangen → Browser öffnet neuen Tab / neues Fenster.
 */
export function useSafeLinkProps() {
  const [, navigate] = useLocation();
  const { confirmLeave } = useContext(UnsavedChangesContext);

  return useCallback(
    (to: string) => ({
      href: to,
      onClick: (e: MouseEvent<HTMLElement>) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        confirmLeave(() => navigate(to));
      },
    }),
    [navigate, confirmLeave],
  );
}

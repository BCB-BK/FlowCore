import { createContext, useContext, useCallback } from "react";
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

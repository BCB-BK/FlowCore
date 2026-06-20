import { createContext, useContext } from "react";

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

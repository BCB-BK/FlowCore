import type { ComponentProps } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BlockEditor } from "./BlockEditor";

export function BlockEditorWithBoundary(props: ComponentProps<typeof BlockEditor>) {
  return (
    <ErrorBoundary
      compact
      fallbackTitle="Editor-Fehler"
      fallbackMessage="Der Editor konnte nicht geladen werden. Bitte versuchen Sie es erneut."
    >
      <BlockEditor {...props} />
    </ErrorBoundary>
  );
}

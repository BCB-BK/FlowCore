import { useEffect } from "react";

const APP_NAME = "FlowCore";

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${APP_NAME} – ${title}` : APP_NAME;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

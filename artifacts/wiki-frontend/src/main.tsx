import "./polyfills";
import { createRoot } from "react-dom/client";
import {
  setDefaultHeaders,
  setSessionExpiredHandler,
} from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  setDefaultHeaders({
    "X-Dev-Principal-Id": "c911a9df-b47c-4539-9d26-c106825968b6",
  });
}

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
setSessionExpiredHandler(() => {
  window.location.href = `${base}/?auth_error=session_invalidated`;
});

createRoot(document.getElementById("root")!).render(<App />);

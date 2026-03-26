import "./polyfills";
import { createRoot } from "react-dom/client";
import { setDefaultHeaders } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  setDefaultHeaders({
    "X-Dev-Principal-Id": "c911a9df-b47c-4539-9d26-c106825968b6",
  });
}

createRoot(document.getElementById("root")!).render(<App />);

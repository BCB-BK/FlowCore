import { createRoot } from "react-dom/client";
import { setDefaultHeaders } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  setDefaultHeaders({
    "X-Dev-Principal-Id": "00000000-0000-0000-0000-000000000001",
  });
}

createRoot(document.getElementById("root")!).render(<App />);

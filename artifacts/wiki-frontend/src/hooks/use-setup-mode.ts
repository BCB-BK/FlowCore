import { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";

let cachedValue: boolean | null = null;
let fetchPromise: Promise<boolean> | null = null;

function fetchSetupMode(): Promise<boolean> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = customFetch<{ setupMode: boolean }>("/api/admin/setup-mode")
    .then((data) => {
      cachedValue = data.setupMode;
      setTimeout(() => {
        fetchPromise = null;
      }, 30_000);
      return cachedValue;
    })
    .catch(() => {
      fetchPromise = null;
      return false;
    });
  return fetchPromise;
}

export function invalidateSetupModeCache() {
  cachedValue = null;
  fetchPromise = null;
}

export function useSetupMode() {
  const [setupMode, setSetupMode] = useState(cachedValue ?? false);
  const [loading, setLoading] = useState(cachedValue === null);

  useEffect(() => {
    if (cachedValue !== null) {
      setSetupMode(cachedValue);
      setLoading(false);
      return;
    }
    fetchSetupMode().then((val) => {
      setSetupMode(val);
      setLoading(false);
    });
  }, []);

  return { setupMode, loading };
}

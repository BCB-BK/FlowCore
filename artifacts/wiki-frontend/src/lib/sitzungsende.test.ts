/**
 * Laufzeitbeweis: Ein 401 führt zur Anmeldeseite — die Anmeldeprobe aber nicht.
 *
 * Hintergrund (gemeldet 10.09.2026 aus der Review-Inbox): Der Client prüfte den
 * Fehlerrumpf auf die Zeichenkette „session invalidated". Die sendet der Server
 * nur, wenn ein Konto nicht mehr in der geforderten Entra-Gruppe ist. Die nach
 * acht Stunden abgelaufene Sitzung meldet dagegen `Authentication required` —
 * und wurde deshalb nie als Sitzungsende erkannt. Die Oberfläche zeigte weiter
 * zwischengespeicherte Inhalte und quittierte jede Aktion mit einem rohen
 * „HTTP 401 Unauthorized", statt zur Anmeldung zu führen.
 *
 * Der zweite Fall ist die Gegenprobe und der Grund, warum hier nicht einfach
 * jeder 401 umleitet: `AuthGate` fragt beim Start `/api/auth/me`. Abgemeldet
 * antwortet das mit 401. Würde das umleiten, lüde die Anmeldeseite sich selbst
 * endlos neu.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  customFetch,
  setSessionExpiredHandler,
} from "@workspace/api-client-react";

const originalFetch = globalThis.fetch;

function antwortMit(status: number, rumpf: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(rumpf), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

let gemeldet: number;

beforeEach(() => {
  gemeldet = 0;
  setSessionExpiredHandler(() => {
    gemeldet += 1;
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  setSessionExpiredHandler(null);
});

describe("401-Behandlung", () => {
  it("meldet die abgelaufene Sitzung — auch ohne die Worte „session invalidated“", async () => {
    antwortMit(401, { error: "Authentication required" });
    await expect(
      customFetch("/api/content/deletion-requests"),
    ).rejects.toThrow();
    expect(gemeldet).toBe(1);
  });

  it("meldet auch den Gruppenentzug weiterhin", async () => {
    antwortMit(401, {
      error: "Session invalidated: user no longer in required group",
    });
    await expect(customFetch("/api/content/nodes")).rejects.toThrow();
    expect(gemeldet).toBe(1);
  });

  it("meldet die Anmeldeprobe NICHT — sonst lädt die Anmeldeseite sich endlos neu", async () => {
    antwortMit(401, { error: "Authentication required" });
    await expect(customFetch("/api/auth/me")).rejects.toThrow();
    expect(gemeldet).toBe(0);
  });

  it("meldet auch dann nicht, wenn die Anmeldeprobe eine Abfrage trägt", async () => {
    antwortMit(401, { error: "Authentication required" });
    await expect(customFetch("/api/auth/me?frisch=1")).rejects.toThrow();
    expect(gemeldet).toBe(0);
  });

  it("meldet genau einmal, auch wenn mehrere Anfragen gleichzeitig scheitern", async () => {
    antwortMit(401, { error: "Authentication required" });
    await Promise.allSettled([
      customFetch("/api/content/nodes"),
      customFetch("/api/content/deletion-requests"),
      customFetch("/api/content/reviews"),
    ]);
    expect(gemeldet).toBe(1);
  });

  it("lässt andere Fehler unberührt", async () => {
    antwortMit(403, { error: "Forbidden" });
    await expect(customFetch("/api/content/nodes")).rejects.toThrow();
    expect(gemeldet).toBe(0);
  });
});

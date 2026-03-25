import { test, expect } from "@playwright/test";

test.describe("Health Endpoint", () => {
  test("GET /api/healthz returns 200 with status ok", async ({ request }) => {
    const response = await request.get("/api/healthz");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("database");
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });

  test("health response includes correlation ID header", async ({
    request,
  }) => {
    const response = await request.get("/api/healthz", {
      headers: { "x-correlation-id": "test-correlation-123" },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["x-correlation-id"]).toBe(
      "test-correlation-123",
    );
  });

  test("auto-generates correlation ID if not provided", async ({
    request,
  }) => {
    const response = await request.get("/api/healthz");
    expect(response.status()).toBe(200);
    const correlationId = response.headers()["x-correlation-id"];
    expect(correlationId).toBeTruthy();
    expect(correlationId.length).toBeGreaterThan(0);
  });
});

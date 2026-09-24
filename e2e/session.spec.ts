import { test, expect } from "@playwright/test";

test.describe("Session persistence", () => {
  test("issues sid cookie on first visit", async ({ page, context }) => {
    await page.goto("/");
    const cookies = await context.cookies();
    const sid = cookies.find((c) => c.name === "sid");
    expect(sid).toBeDefined();
    expect(sid?.httpOnly).toBe(true);
    expect(sid?.sameSite).toBe("Lax");
    // UUID v4 format
    expect(sid?.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test("reuses the same sid cookie on subsequent visits", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    const cookies1 = await context.cookies();
    const sid1 = cookies1.find((c) => c.name === "sid")?.value;

    await page.goto("/");
    const cookies2 = await context.cookies();
    const sid2 = cookies2.find((c) => c.name === "sid")?.value;

    expect(sid1).toBe(sid2);
  });
});

test.describe("Health check", () => {
  test("GET /api/health returns 200 with db:up", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json() as { status: string; db: string; uptime: number };
    expect(body.status).toBe("ok");
    expect(body.db).toBe("up");
    expect(typeof body.uptime).toBe("number");
  });
});

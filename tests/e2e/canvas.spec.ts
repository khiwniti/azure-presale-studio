/**
 * E2E Tests for Canvas Page
 * Tests the full user flow: create canvas, edit nodes, save, export
 * Spec §5 (Frontend UX - Testing).
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Canvas Page E2E", () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("should display landing page with hero section", async () => {
    await expect(page.locator("h1")).toContainText("Turn natural language into validated Azure designs");
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.locator("button:has-text('Generate Architecture')")).toBeVisible();
  });

  test("should create a new canvas from prompt", async () => {
    // Fill in the prompt
    await page.fill("textarea", "Create a web app with App Service, SQL Database, and Redis Cache in eastus");
    
    // Click generate
    await page.click("button:has-text('Generate Architecture')");
    
    // Should redirect to canvas page
    await page.waitForURL(/\/canvas\//);
    await expect(page.locator("h1")).toContainText(/web app|architecture/i);
  });

  test("should display React Flow canvas with nodes", async () => {
    // Navigate to a canvas (create one first)
    await page.fill("textarea", "Create a web app with App Service and SQL Database");
    await page.click("button:has-text('Generate Architecture')");
    await page.waitForURL(/\/canvas\//);
    
    // Check for React Flow canvas
    await expect(page.locator(".react-flow")).toBeVisible();
    
    // Check for nodes
    const nodeCount = await page.locator(".azure-node").count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test("should allow inline editing of node label", async () => {
    await page.fill("textarea", "Create a web app with App Service");
    await page.click("button:has-text('Generate Architecture')");
    await page.waitForURL(/\/canvas\//);
    
    // Click on a node label to edit
    const nodeLabel = page.locator(".azure-node h4").first();
    await nodeLabel.click();
    
    // Should be editable
    await expect(page.locator("[contenteditable='true']")).toBeVisible();
  });

  test("should show config panel when node selected", async () => {
    await page.fill("textarea", "Create a web app with App Service");
    await page.click("button:has-text('Generate Architecture')");
    await page.waitForURL(/\/canvas\//);
    
    // Click on a node
    await page.locator(".azure-node").first().click();
    
    // Config panel should appear
    await expect(page.locator(".config-panel")).toBeVisible();
    await expect(page.locator("text=Configuration")).toBeVisible();
  });

  test("should save canvas changes", async () => {
    await page.fill("textarea", "Create a web app with App Service");
    await page.click("button:has-text('Generate Architecture')");
    await page.waitForURL(/\/canvas\//);
    
    // Click save
    await page.click("button:has-text('Save')");
    
    // Should show success (no error toast)
    await expect(page.locator(".toast-error")).not.toBeVisible();
  });

  test("should open report wizard", async () => {
    await page.fill("textarea", "Create a web app with App Service");
    await page.click("button:has-text('Generate Architecture')");
    await page.waitForURL(/\/canvas\//);
    
    // Click generate report
    await page.click("button:has-text('Generate Report')");
    
    // Report wizard modal should appear
    await expect(page.locator("text=Generate Report")).toBeVisible();
    await expect(page.locator("text=Architecture Summary")).toBeVisible();
  });
});

test.describe("API Routes", () => {
  test("GET /api/canvases should return empty array for new session", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/canvases`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.canvases).toEqual([]);
  });

  test("POST /api/canvases should create new canvas", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/canvases`, {
      data: { prompt: "Test architecture" },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.canvasId).toBeDefined();
    expect(data.runId).toBeDefined();
  });

  test("GET /api/canvases/[id] should return canvas", async ({ request }) => {
    // Create a canvas first
    const createResponse = await request.post(`${BASE_URL}/api/canvases`, {
      data: { prompt: "Test architecture" },
    });
    const { canvasId } = await createResponse.json();
    
    // Fetch it
    const response = await request.get(`${BASE_URL}/api/canvases/${canvasId}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.diagramJson).toBeDefined();
  });

  test("GET /api/session should return session settings", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/session`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.hasKey).toBeDefined();
    expect(data.defaultModel).toBeDefined();
  });

  test("POST /api/session should save NIM API key", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/session`, {
      data: { apiKey: "nvapi-test-key-123" },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

test.describe("Export Endpoints", () => {
  let canvasId: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/canvases`, {
      data: { prompt: "Test architecture for export" },
    });
    const data = await response.json();
    canvasId = data.canvasId;
  });

  test("GET /api/export/[id]/svg should return SVG", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/svg`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
  });

  test("GET /api/export/[id]/png should return PNG", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/png`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("GET /api/export/[id]/bicep should return Bicep", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/bicep`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/plain");
  });

  test("GET /api/export/[id]/terraform should return Terraform", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/terraform`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/plain");
  });

  test("GET /api/export/[id]/xlsx should return XLSX", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/xlsx`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("spreadsheetml");
  });

  test("GET /api/export/[id]/zip should return ZIP bundle", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/export/${canvasId}/zip`);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/zip");
  });
});
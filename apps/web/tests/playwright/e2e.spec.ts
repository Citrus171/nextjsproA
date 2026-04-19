import { test, expect } from "@playwright/test";

const baseUrl = process.env.VITE_API_BASE_URL
  ? "http://localhost:5173"
  : "http://localhost:5175";

test("basic E2E flow: register → login → create post → view posts", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = "password123";

  // 1. Register
  await page.goto(`${baseUrl}/register`);
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  await page.fill('input[placeholder="name"]', "E2E User");
  await page.click('button:has-text("Register")');

  // Wait for redirect to login (Register component navigates on success)
  await page.waitForURL(`${baseUrl}/login`);

  // 2. Login
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  await page.click('button:has-text("Login")');

  // Should navigate to posts page
  await page.waitForURL(`${baseUrl}/`);
  await expect(page.locator("nav")).toContainText("Logout");

  // 3. Create post (use link click to preserve in-memory auth token)
  await page.click('a[href="/create"]');
  await page.waitForURL(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "E2E Test Post");
  await page.fill(
    'textarea[placeholder="content"]',
    "This is a test post content"
  );
  await page.click('button:has-text("Create")');

  // Should navigate back to posts page
  await page.waitForURL(`${baseUrl}/`);

  // 4. Verify post appears in list
  await expect(page.locator("h3")).toContainText("E2E Test Post");
  await expect(page.locator("p")).toContainText("This is a test post content");

  // 5. Logout
  await page.click('button:has-text("Logout")');
  await expect(page.locator("nav")).toContainText("Login");
});

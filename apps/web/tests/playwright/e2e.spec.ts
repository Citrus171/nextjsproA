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
  const registerResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/users/register") &&
      res.request().method() === "POST"
  );
  await page.click('button:has-text("Register")');

  const registerResponse = await registerResponsePromise;
  expect(
    registerResponse.ok(),
    `register failed: ${registerResponse.status()} ${registerResponse.statusText()}`
  ).toBeTruthy();

  // Wait for redirect to login (Register component navigates on success)
  await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 15000 });

  // 2. Login
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  const loginResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/auth/login") && res.request().method() === "POST"
  );
  await page.click('button:has-text("Login")');

  const loginResponse = await loginResponsePromise;
  expect(
    loginResponse.ok(),
    `login failed: ${loginResponse.status()} ${loginResponse.statusText()}`
  ).toBeTruthy();

  // Should navigate to posts page
  await expect(page).toHaveURL(`${baseUrl}/`, { timeout: 15000 });
  await expect(page.locator("nav")).toContainText("Logout");

  // 3. Create post (use link click to preserve in-memory auth token)
  await page.click('a[href="/create"]');
  await page.waitForURL(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "E2E Test Post");
  await page.fill(
    'textarea[placeholder="description"]',
    "This is a test post content"
  );
  await page.fill('input[type="date"]', "2024-01-01");
  await page.click('button:has-text("Create")');

  // Should navigate back to posts page
  await page.waitForURL(`${baseUrl}/`);

  // 4. Verify post appears in list
  await expect(page.locator("h3")).toContainText("E2E Test Post");
  await expect(page.locator("p")).toContainText("This is a test post content"); // description

  // 5. Logout
  await page.click('button:has-text("Logout")');
  await expect(page.locator("nav")).toContainText("Login");
});

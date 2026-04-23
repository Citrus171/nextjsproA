import { test, expect } from "@playwright/test";

const baseUrl = "http://localhost:5173";

test("basic E2E flow: register → login → create post → view posts", async ({
  page,
}) => {
  const email = `e2e-${crypto.randomUUID()}@test.com`;
  const postTitle = `E2E Test Post ${crypto.randomUUID()}`;
  const postDescription = "This is a test post content";
  const password = "password123";

  // 1. Register
  await page.goto(`${baseUrl}/register`);
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  await page.fill(
    'input[placeholder="name"]',
    `E2E User ${crypto.randomUUID()}`
  );
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

  // Login now returns to the posts page so the shared header remains available.
  await expect(page).toHaveURL(`${baseUrl}/posts`, { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  // 3. Create post from the posts page so the shared header is available.
  await page.click('a[href="/create"]');
  await page.waitForURL(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', postTitle);
  await page.fill('textarea[placeholder="description"]', postDescription);
  await page.fill('input[type="date"]', "2024-01-01");
  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/posts") && res.request().method() === "POST"
  );
  await page.click('button:has-text("Create")');
  const createResponse = await createResponsePromise;
  expect(
    createResponse.ok(),
    `create post failed: ${createResponse.status()} ${createResponse.statusText()}`
  ).toBeTruthy();

  // The create form returns to the posts page, where the new item should appear.
  await page.waitForURL(`${baseUrl}/posts`);

  // 4. Verify post appears in list
  await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();

  // 5. Logout
  await page.click('button:has-text("Logout")');
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

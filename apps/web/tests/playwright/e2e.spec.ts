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
  await page.getByLabel("お名前").fill(`E2E User ${crypto.randomUUID()}`);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByLabel("パスワード（確認）").fill(password);
  const registerResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/users/register") &&
      res.request().method() === "POST"
  );
  await page.getByRole("button", { name: "アカウントを作成" }).click();

  const registerResponse = await registerResponsePromise;
  expect(
    registerResponse.ok(),
    `register failed: ${registerResponse.status()} ${registerResponse.statusText()}`
  ).toBeTruthy();

  // Wait for redirect to login (Register component navigates on success)
  await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 15000 });

  // 2. Login
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  const loginResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/auth/login") && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: "ログイン" }).click();

  const loginResponse = await loginResponsePromise;
  expect(
    loginResponse.ok(),
    `login failed: ${loginResponse.status()} ${loginResponse.statusText()}`
  ).toBeTruthy();

  // Login now returns to the posts page so the shared header remains available.
  await expect(page).toHaveURL(`${baseUrl}/posts`, { timeout: 15000 });

  // 3. Create post from the posts page so the shared header is available.
  await page.click('a[href="/create"]');
  await page.waitForURL(`${baseUrl}/create`);
  await page.fill('input[placeholder="例：レオ"]', "ミケ");
  await page.fill('input[placeholder="例：推定2歳"]', "2歳");
  await page.fill('input[placeholder="例：茶トラ、白黒ハチワレ"]', "白黒");
  await page.fill(
    'textarea[placeholder="例：かぎしっぽです。少し人見知りですが、おやつを見せると寄ってきます。"]',
    "かぎしっぽ"
  );
  await page.fill(
    'textarea[placeholder="例：首輪なし。人懐こい性格で、名前を呼ぶと振り向きます。"]',
    postDescription
  );
  await page.fill('input[type="datetime-local"]', "2024-01-01T12:00");
  await page.fill('input[placeholder="例：さいたま市"]', "さいたま市");
  await page.fill(
    'input[placeholder="例：〇〇1-2-3 〇〇公園付近"]',
    "中央区1-2-3"
  );
  await page.locator(".leaflet-container").click({
    position: { x: 260, y: 170 },
  });
  await page.fill(
    'input[placeholder="例：白猫のミケを探しています"]',
    postTitle
  );

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/posts") && res.request().method() === "POST"
  );
  await page.click('button:has-text("この内容で報告する")');
  const createResponse = await createResponsePromise;
  expect(
    createResponse.ok(),
    `create post failed: ${createResponse.status()} ${createResponse.statusText()}`
  ).toBeTruthy();

  // The create form returns to the posts page, where the new item should appear.
  await page.waitForURL(`${baseUrl}/posts`);

  // 4. Verify post appears in list (pet name is shown as heading)
  await expect(
    page.getByRole("heading", { name: "ミケ" }).first()
  ).toBeVisible();

  // 5. Logout from map page
  await page.goto(`${baseUrl}/`);
  await page.getByRole("button", { name: "アカウント" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "OK" })
    .click();

  // Verify redirected to login page
  await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 15000 });
});

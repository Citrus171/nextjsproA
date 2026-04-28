import { test, expect } from "@playwright/test";

const baseUrl = "http://localhost:5173";

test("画像3枚で迷い猫投稿し、マーカークリックで登録内容が表示されること", async ({
  page,
}) => {
  const email = `e2e-map-${crypto.randomUUID()}@test.com`;
  const password = "password123";
  const uniqueToken = `E2E-${crypto.randomUUID()}`;
  const title = `${uniqueToken}-title`;
  const description = `${uniqueToken}-description`;

  await page.goto(`${baseUrl}/register`);
  await page.getByLabel("お名前").fill(`E2E User ${uniqueToken}`);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByLabel("パスワード（確認）").fill(password);
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/users/register") &&
        res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "アカウントを作成" }).click(),
  ]);
  await expect(page).toHaveURL(`${baseUrl}/login`);

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/login") &&
        res.request().method() === "POST"
    ),
    page.getByRole("button", { name: "ログイン" }).click(),
  ]);
  await expect(page).toHaveURL(`${baseUrl}/posts`);

  await page.click('a[href="/create"]');
  await expect(page).toHaveURL(`${baseUrl}/create`);

  await page.fill('input[placeholder="例：レオ"]', "ミケ");
  await page.fill('input[placeholder="例：推定2歳"]', "2歳");
  await page.fill('input[placeholder="例：茶トラ、白黒ハチワレ"]', "白黒");
  await page.fill(
    'textarea[placeholder="例：かぎしっぽです。少し人見知りですが、おやつを見せると寄ってきます。"]',
    "かぎしっぽ"
  );
  await page.fill(
    'textarea[placeholder="例：首輪なし。人懐こい性格で、名前を呼ぶと振り向きます。"]',
    description
  );
  await page.fill('input[type="datetime-local"]', "2026-04-21T12:30");
  await page.fill('input[placeholder="例：さいたま市"]', "さいたま市");
  await page.fill(
    'input[placeholder="例：〇〇1-2-3 〇〇公園付近"]',
    "中央区1-2-3"
  );

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    "public/omiya-station.jpg",
    "public/omiya-station.jpg",
    "public/omiya-station.jpg",
  ]);

  await page
    .locator(".leaflet-container")
    .click({ position: { x: 260, y: 170 } });
  await page.fill('input[placeholder="例：白猫のミケを探しています"]', title);

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/posts") && res.request().method() === "POST"
  );
  await page.getByRole("button", { name: "この内容で報告する" }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBeTruthy();

  await expect(page).toHaveURL(`${baseUrl}/posts`);

  await page.goto(`${baseUrl}/`);
  await expect(
    page.getByRole("group", { name: "地図フィルター" })
  ).toBeVisible();
  await expect(page.locator(".map-marker-icon").first()).toBeVisible();

  const markerCount = await page.locator(".map-marker-icon").count();
  let found = false;

  for (let i = 0; i < markerCount; i += 1) {
    await page.locator(".map-marker-icon").nth(i).dispatchEvent("click");
    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog).toBeVisible();
    await expect(detailDialog.locator("text=読み込み中")).not.toBeVisible({
      timeout: 5000,
    });

    const titleEl = detailDialog.locator(`text=${uniqueToken}`);
    if ((await titleEl.count()) > 0) {
      found = true;
      break;
    }

    await page.getByRole("button", { name: "閉じる" }).first().click();
  }

  expect(found).toBeTruthy();
});

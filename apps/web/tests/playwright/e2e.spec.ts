import { test, expect } from "@playwright/test";
import fs from "fs";

const baseUrl = "http://localhost:5175";
const apiBase = "http://localhost:3000/api";

test("post owner can update their own post", async ({ request }) => {
  const email = `owner${Date.now()}@example.test`;
  const password = "password123";

  // Register and login as owner
  await request.post(`${apiBase}/users/register`, {
    data: { email, password, name: "Owner" },
  });
  const loginRes = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  });
  const { accessToken } = await loginRes.json();

  // Create a post
  const createRes = await request.post(`${apiBase}/posts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { title: "Original title", content: "Original content" },
  });
  const post = await createRes.json();
  expect(createRes.status()).toBe(201);

  // Update the post as owner → 200
  const updateRes = await request.put(`${apiBase}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { title: "Updated title", content: "Updated content" },
  });
  expect(updateRes.status()).toBe(200);
  const updated = await updateRes.json();
  expect(updated.title).toBe("Updated title");
  expect(updated.content).toBe("Updated content");
});

test("non-owner cannot update or delete another user's post", async ({ request }) => {
  const ownerEmail = `owner2${Date.now()}@example.test`;
  const otherEmail = `other2${Date.now()}@example.test`;
  const password = "password123";

  // Register owner and create a post
  await request.post(`${apiBase}/users/register`, {
    data: { email: ownerEmail, password, name: "Owner" },
  });
  const ownerLogin = await request.post(`${apiBase}/auth/login`, {
    data: { email: ownerEmail, password },
  });
  const { accessToken: ownerToken } = await ownerLogin.json();

  const createRes = await request.post(`${apiBase}/posts`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
    data: { title: "Owner post", content: "Owner content" },
  });
  const post = await createRes.json();

  // Register other user
  await request.post(`${apiBase}/users/register`, {
    data: { email: otherEmail, password, name: "Other" },
  });
  const otherLogin = await request.post(`${apiBase}/auth/login`, {
    data: { email: otherEmail, password },
  });
  const { accessToken: otherToken } = await otherLogin.json();

  // Other user tries to update → 403
  const updateRes = await request.put(`${apiBase}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
    data: { title: "Hacked title" },
  });
  expect(updateRes.status()).toBe(403);

  // Other user tries to delete → 403
  const deleteRes = await request.delete(`${apiBase}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  expect(deleteRes.status()).toBe(403);

  // Confirm post is unchanged
  const getRes = await request.get(`${apiBase}/posts/${post.id}`);
  const unchanged = await getRes.json();
  expect(unchanged.title).toBe("Owner post");
});

test("A-D auth refresh flow (UI)", async ({ page, request, context }) => {
  const email = `user${Date.now()}@example.test`;
  const password = "password123";

  // A: Register via UI
  const requests: any[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("/posts") ||
      url.includes("/auth/refresh") ||
      url.includes("/users/register")
    ) {
      requests.push({ type: "request", url, headers: req.headers() });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (
      url.includes("/posts") ||
      url.includes("/auth/refresh") ||
      url.includes("/users/register")
    ) {
      requests.push({
        type: "response",
        url,
        status: res.status(),
        headers: res.headers(),
        body: await res.text().catch(() => ""),
      });
    }
  });

  await page.goto(`${baseUrl}/register`);
  await page.fill('input[placeholder="name"]', "u");
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  await page.click('button:has-text("Register")');
  // wait for navigation to login or network
  await page.waitForTimeout(1000);
  fs.mkdirSync("playwright-screens", { recursive: true });
  fs.writeFileSync(
    "playwright-screens/a_requests_after_register.json",
    JSON.stringify(requests, null, 2),
  );

  // A: Login via UI
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[placeholder="email"]', email);
  await page.fill('input[placeholder="password"]', password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(`${baseUrl}/`);
  const tokenA = await page.evaluate(() => localStorage.getItem("token"));
  fs.mkdirSync("playwright-screens", { recursive: true });
  fs.writeFileSync(
    "playwright-screens/a1_localstorage_token.txt",
    tokenA ?? "",
  );
  await page.screenshot({
    path: "playwright-screens/a2_post_list.png",
    fullPage: true,
  });

  // Create a post (should succeed)
  await page.goto(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "title-A");
  await page.fill('textarea[placeholder="content"]', "content-A");
  await page.click('button:has-text("Create")');
  await page.waitForURL(`${baseUrl}/`);
  await page.screenshot({
    path: "playwright-screens/a3_after_create.png",
    fullPage: true,
  });

  // B: Tamper token, attempt create -> expect refresh flow
  await page.evaluate(() => {
    const t = localStorage.getItem("token");
    if (t) localStorage.setItem("token", "x" + t);
  });
  const requestsB: any[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/posts") || url.includes("/auth/refresh")) {
      requestsB.push({ type: "request", url, headers: req.headers() });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/posts") || url.includes("/auth/refresh")) {
      requestsB.push({
        type: "response",
        url,
        status: res.status(),
        headers: res.headers(),
        body: await res.text().catch(() => ""),
      });
    }
  });

  // Trigger create
  await page.goto(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "title-B");
  await page.fill('textarea[placeholder="content"]', "content-B");
  await page.click('button:has-text("Create")');
  // wait a bit for refresh/retry
  await page.waitForTimeout(1500);
  fs.writeFileSync(
    "playwright-screens/b_requests.json",
    JSON.stringify(requestsB, null, 2),
  );
  await page.screenshot({
    path: "playwright-screens/b_after_tamper.png",
    fullPage: true,
  });

  // C: Tamper cookie (refresh failure)
  // Replace refreshToken cookie with invalid value
  const cookies = await context.cookies();
  const rt = cookies.find((c) => c.name === "refreshToken");
  if (rt) {
    await context.addCookies([
      {
        name: "refreshToken",
        value: "badtoken",
        domain: rt.domain || "localhost",
        path: "/",
      },
    ]);
  }
  // Attempt create
  await page.goto(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "title-C");
  await page.fill('textarea[placeholder="content"]', "content-C");
  await page.click('button:has-text("Create")');
  await page.waitForTimeout(800);
  const cookieList = await context.cookies();
  fs.writeFileSync(
    "playwright-screens/c_cookies_after_tamper.json",
    JSON.stringify(cookieList, null, 2),
  );
  await page.screenshot({
    path: "playwright-screens/c_after_cookie_tamper.png",
    fullPage: true,
  });

  // Check navigation to /login if token cleared
  await page.waitForTimeout(500);
  fs.writeFileSync("playwright-screens/c_location.txt", page.url());

  // D: Logout
  // Ensure logged in again to test logout
  // login via API and set token
  const loginRes = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  });
  const json = await loginRes.json();
  if (json?.accessToken) {
    await page.evaluate(
      (t) => localStorage.setItem("token", t),
      json.accessToken,
    );
  }
  await page.reload();
  // Click Logout button in nav
  await page.click('button:has-text("Logout")');
  await page.waitForTimeout(500);
  const cookiesAfterLogout = await context.cookies();
  fs.writeFileSync(
    "playwright-screens/d_cookies_after_logout.json",
    JSON.stringify(cookiesAfterLogout, null, 2),
  );
  await page.screenshot({
    path: "playwright-screens/d_after_logout.png",
    fullPage: true,
  });

  // Try create without auth
  await page.goto(`${baseUrl}/create`);
  await page.fill('input[placeholder="title"]', "title-D");
  await page.fill('textarea[placeholder="content"]', "content-D");
  await page.click('button:has-text("Create")');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "playwright-screens/d_create_without_auth.png",
    fullPage: true,
  });
});

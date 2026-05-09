import { request } from "@playwright/test";

const API_HEALTH_URL = "http://localhost:3000/api/health";
const WEB_URL = "http://localhost:5173";
const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 60000;

async function waitForUrl(url: string, label: string): Promise<void> {
  const ctx = await request.newContext();
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const res = await ctx.get(url);
      if (res.status() < 500) {
        await ctx.dispose();
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  await ctx.dispose();
  throw new Error(
    `${label} が ${MAX_WAIT_MS / 1000}s 以内に起動しませんでした: ${url}`
  );
}

export default async function globalSetup(): Promise<void> {
  await Promise.all([
    waitForUrl(API_HEALTH_URL, "API サーバー"),
    waitForUrl(WEB_URL, "Web サーバー"),
  ]);
}

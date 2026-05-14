import http from "k6/http";
import { check, sleep } from "k6";
import { loginWithCookie, logout, USERS, BASE_URL } from "../lib/auth.js";

/**
 * Auth flow: login → refresh → logout.
 * Uses seed-sighter to avoid contention with posts/sightings scenarios.
 * Measures bcrypt-heavy login latency independently.
 */
export function authFlow() {
  const { token, refreshToken } = loginWithCookie(USERS.sighter);
  if (!token) {
    sleep(1);
    return;
  }

  sleep(0.5);

  // Secure cookie は http:// に自動送信されないため手動で注入する
  const jar = http.cookieJar();
  if (refreshToken) {
    jar.set(`${BASE_URL}/api/auth/refresh`, "refreshToken", refreshToken, {
      secure: false,
    });
  }

  const refreshRes = http.post(`${BASE_URL}/api/auth/refresh`, null, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { type: "auth", scenario: "auth" },
  });
  check(refreshRes, { "refresh 200": (r) => r.status === 200 });

  sleep(0.5);

  logout(token);

  sleep(1);
}

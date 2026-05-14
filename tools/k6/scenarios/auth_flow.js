import http from "k6/http";
import { check, sleep } from "k6";
import { login, logout, USERS, BASE_URL } from "../lib/auth.js";

/**
 * Auth flow: login → refresh → logout.
 * Uses seed-sighter to avoid contention with posts/sightings scenarios.
 * Measures bcrypt-heavy login latency independently.
 */
export function authFlow() {
  const token = login(USERS.sighter);
  if (!token) {
    sleep(1);
    return;
  }

  sleep(0.5);

  const refreshRes = http.post(`${BASE_URL}/api/auth/refresh`, null, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { type: "auth", scenario: "auth" },
  });
  check(refreshRes, { "refresh 200": (r) => r.status === 200 });

  sleep(0.5);

  logout(token);

  sleep(1);
}

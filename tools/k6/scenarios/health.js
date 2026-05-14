import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL } from "../lib/auth.js";

/**
 * Baseline health check — no auth, constant low load.
 * Used to detect infra-level degradation independent of business logic.
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { type: "read", scenario: "health" },
  });

  check(res, {
    "health 200": (r) => r.status === 200,
    "health status ok": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL } from "../lib/auth.js";

/**
 * Baseline health check — no auth, constant low load.
 * Used to detect infra-level degradation independent of business logic.
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, {
    // 403 = reverse proxy blocks public access to health endpoint (production)
    responseCallback: http.expectedStatuses(200, 403),
    tags: { type: "read", scenario: "health" },
  });

  check(res, {
    "health reachable": (r) => r.status === 200 || r.status === 403,
    "health status ok": (r) => {
      if (r.status !== 200) return true; // proxy-blocked is acceptable
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

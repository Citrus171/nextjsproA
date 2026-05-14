import http from "k6/http";
import { check, sleep } from "k6";
import { authParams, BASE_URL } from "../lib/auth.js";

/**
 * Map markers scenario — typically cached/static, so useful as a latency floor reference.
 * @param {string} token - Access token from setup()
 */
export function readMapMarkers(token) {
  const res = http.get(
    `${BASE_URL}/api/map/markers`,
    authParams(token, { scenario: "map" })
  );

  check(res, { "GET /map/markers 200": (r) => r.status === 200 });

  sleep(1);
}

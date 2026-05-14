import http from "k6/http";
import { check, sleep } from "k6";
import { authParams, BASE_URL } from "../lib/auth.js";

/**
 * Read-heavy sightings scenario.
 * GET /api/sightings requires postId as a mandatory query parameter.
 * @param {string} token - Access token from setup()
 * @param {string[]} postIds - Post IDs fetched in setup() (used as postId filter)
 * @param {string[]} sightingIds - Sighting IDs fetched in setup()
 */
export function readSightings(token, postIds = [], sightingIds = []) {
  if (postIds.length === 0) {
    sleep(1);
    return;
  }

  const params = authParams(token, { scenario: "sightings" });
  const postId = postIds[Math.floor(Math.random() * postIds.length)];

  const listRes = http.get(
    `${BASE_URL}/api/sightings?postId=${postId}`,
    params
  );
  check(listRes, { "GET /sightings 200": (r) => r.status === 200 });

  if (sightingIds.length > 0) {
    const id = sightingIds[Math.floor(Math.random() * sightingIds.length)];
    const detailRes = http.get(`${BASE_URL}/api/sightings/${id}`, params);
    check(detailRes, { "GET /sightings/:id 200": (r) => r.status === 200 });
  }

  sleep(1);
}

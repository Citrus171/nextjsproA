import http from "k6/http";
import { check, sleep } from "k6";
import { authParams, BASE_URL } from "../lib/auth.js";

/**
 * Read-heavy posts scenario.
 * @param {string} token - Access token from setup()
 * @param {string[]} postIds - Post IDs fetched in setup() for detail requests
 */
export function readPosts(token, postIds = []) {
  const params = authParams(token, { scenario: "posts" });

  const listRes = http.get(`${BASE_URL}/api/posts`, params);
  check(listRes, { "GET /posts 200": (r) => r.status === 200 });

  if (postIds.length > 0) {
    const id = postIds[Math.floor(Math.random() * postIds.length)];
    const detailRes = http.get(`${BASE_URL}/api/posts/${id}`, params);
    check(detailRes, { "GET /posts/:id 200": (r) => r.status === 200 });
  }

  sleep(1);
}

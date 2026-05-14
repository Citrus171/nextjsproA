/**
 * Smoke test — 本番疎通確認用（低負荷）
 * k6 run --env BASE_URL=https://example.com tools/k6/smoke.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { login, USERS, BASE_URL } from "./lib/auth.js";

export const options = {
  vus: 2,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export function setup() {
  const token = login(USERS.owner);
  if (!token) throw new Error("smoke: login failed");

  const postsRes = http.get(`${BASE_URL}/api/posts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let postIds = [];
  try {
    const body = JSON.parse(postsRes.body);
    const items = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    postIds = items
      .slice(0, 5)
      .map((p) => p.id)
      .filter(Boolean);
  } catch {}

  return { token, postIds };
}

export default function (data) {
  const h = { Authorization: `Bearer ${data.token}` };

  // health (403 in prod = proxy block = OK)
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    responseCallback: http.expectedStatuses(200, 403),
  });
  check(healthRes, {
    "health reachable": (r) => r.status === 200 || r.status === 403,
  });

  // posts list
  const listRes = http.get(`${BASE_URL}/api/posts`, { headers: h });
  check(listRes, { "GET /posts 200": (r) => r.status === 200 });

  // post detail
  if (data.postIds.length > 0) {
    const id = data.postIds[Math.floor(Math.random() * data.postIds.length)];
    const detailRes = http.get(`${BASE_URL}/api/posts/${id}`, { headers: h });
    check(detailRes, { "GET /posts/:id 200": (r) => r.status === 200 });
  }

  // map markers
  const mapRes = http.get(`${BASE_URL}/api/map/markers`, { headers: h });
  check(mapRes, { "GET /map/markers 200": (r) => r.status === 200 });

  sleep(1);
}

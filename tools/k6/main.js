/**
 * k6 performance test entry point.
 *
 * Target: VPS 2 vCPU / 2GB RAM, 100+ concurrent users.
 *
 * Usage:
 *   k6 run tools/k6/main.js
 *   k6 run --env BASE_URL=https://api.example.com tools/k6/main.js
 *
 * Scenarios run in parallel with staggered start times to avoid thundering herd.
 */
import { sleep } from "k6";
import { thresholds } from "./lib/thresholds.js";
import { login, USERS, BASE_URL } from "./lib/auth.js";
import { healthCheck } from "./scenarios/health.js";
import { authFlow } from "./scenarios/auth_flow.js";
import { readPosts } from "./scenarios/posts_read.js";
import { readSightings } from "./scenarios/sightings_read.js";
import { readMapMarkers } from "./scenarios/map_markers.js";
import http from "k6/http";

export const options = {
  thresholds,
  scenarios: {
    // ── ベースライン: 常時稼働ヘルスチェック ──────────────────────────
    health: {
      executor: "constant-vus",
      vus: 2,
      duration: "4m",
      exec: "runHealth",
    },

    // ── 認証フロー: bcrypt ボトルネック計測 ───────────────────────────
    auth: {
      executor: "ramping-vus",
      startTime: "10s",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m", target: 10 },
        { duration: "30s", target: 0 },
      ],
      exec: "runAuth",
    },

    // ── 読み取り主体: 投稿一覧・詳細 ─────────────────────────────────
    posts: {
      executor: "ramping-vus",
      startTime: "15s",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "2m", target: 50 },
        { duration: "30s", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "runPosts",
    },

    // ── 読み取り主体: 目撃情報 ────────────────────────────────────────
    sightings: {
      executor: "ramping-vus",
      startTime: "20s",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "2m", target: 20 },
        { duration: "30s", target: 0 },
      ],
      exec: "runSightings",
    },

    // ── 地図マーカー: キャッシュ効果の計測 ───────────────────────────
    map: {
      executor: "constant-vus",
      startTime: "25s",
      vus: 10,
      duration: "3m",
      exec: "runMap",
    },
  },
};

/**
 * setup() は全 VU が開始する前に一度だけ実行される。
 * - 認証トークンを取得
 * - テスト用 ID をフェッチしてシナリオ関数に渡す
 */
export function setup() {
  const token = login(USERS.owner);
  if (!token) {
    throw new Error(
      "setup: login failed — seed data is required (npm run seed)"
    );
  }

  const postsRes = http.get(`${BASE_URL}/api/posts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let postIds = [];
  try {
    const body = JSON.parse(postsRes.body);
    const items = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    postIds = items
      .slice(0, 10)
      .map((p) => p.id)
      .filter(Boolean);
  } catch {}

  let sightingIds = [];
  if (postIds.length > 0) {
    const sightingsRes = http.get(
      `${BASE_URL}/api/sightings?postId=${postIds[0]}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    try {
      const body = JSON.parse(sightingsRes.body);
      const items = Array.isArray(body)
        ? body
        : (body.data ?? body.items ?? []);
      sightingIds = items
        .slice(0, 10)
        .map((s) => s.id)
        .filter(Boolean);
    } catch {}
  }

  return { token, postIds, sightingIds };
}

export function runHealth() {
  healthCheck();
}

export function runAuth() {
  authFlow();
}

export function runPosts(data) {
  readPosts(data.token, data.postIds);
}

export function runSightings(data) {
  readSightings(data.token, data.postIds, data.sightingIds);
}

export function runMap(data) {
  readMapMarkers(data.token);
}

/**
 * teardown() はテスト終了後に一度だけ実行される。
 */
export function teardown(data) {
  // ログアウトは各 VU 内で行うため、ここでは何もしない
}

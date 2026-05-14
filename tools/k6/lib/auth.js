import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

/**
 * Seed user credentials (populated by npm run seed).
 * Each role maps to a different user to avoid lock contention in load tests.
 */
export const USERS = {
  owner: {
    email: "seed-owner@finder.miyaoo.test",
    password: "Password123!",
  },
  sighter: {
    email: "seed-sighter@finder.miyaoo.test",
    password: "Password123!",
  },
  admin: {
    email: "seed-admin@finder.miyaoo.test",
    password: "Password123!",
  },
};

/**
 * Login and return the access token.
 * Tagged as `type:auth` for threshold tracking.
 */
export function login(user = USERS.owner) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { type: "auth" },
    }
  );

  check(res, { "login 200": (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  return body.accessToken ?? null;
}

/**
 * Login and return both the access token and the refresh token cookie value.
 * Use this when the refresh flow needs to be tested over http:// (Secure cookie workaround).
 */
export function loginWithCookie(user = USERS.owner) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { type: "auth" },
    }
  );

  check(res, { "login 200": (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  const refreshToken = res.cookies["refreshToken"]?.[0]?.value ?? null;
  return { token: body.accessToken ?? null, refreshToken };
}

/**
 * Logout (invalidates the refresh token cookie).
 */
export function logout(token) {
  http.post(`${BASE_URL}/api/auth/logout`, null, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { type: "auth" },
  });
}

/**
 * Returns default request params with Authorization header.
 */
export function authParams(token, extraTags = {}) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    tags: { type: "read", ...extraTags },
  };
}

export { BASE_URL };

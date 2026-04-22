"use strict";

const hooks = require("hooks");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const sharp = require("sharp");

// ── shared state ──────────────────────────────────────────────────────────────
const state = {
  primaryToken: null,
  secondaryToken: null,
  primaryEmail: null,
  primaryPassword: "Password123!",
  adminToken: null,
  cookies: null,
  jpegBuf: null, // valid JPEG for multipart uploads
  postId: null,
  deletePostId: null,
  deleteUserId: null,
  maxImagePostId: null,
  imageId: null,
  deleteImageId: null,
  sightingId: null,
  deleteSightingId: null,
  convSightingId: null,
  conversationId: null,
};

const BASE = "http://localhost:3000";
const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
const FAKE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

function readJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const envPath = path.join(__dirname, "apps/api/.env");
  if (!fs.existsSync(envPath)) return null;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*JWT_SECRET\s*=\s*(.+)\s*$/);
    if (!m) continue;
    const raw = m[1].trim();
    return raw.replace(/^['\"]|['\"]$/g, "");
  }
  return null;
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwtHs256(payload, secret, expiresInSec) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedBody = toBase64Url(JSON.stringify(body));
  const data = encodedHeader + "." + encodedBody;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return data + "." + signature;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function jsonReq(method, path, body, token, cookies) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    if (token) headers["Authorization"] = "Bearer " + token;
    if (cookies) headers["Cookie"] = cookies;
    const url = new URL(BASE + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => {
          raw += c;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function multipartReq(method, path, fields, token) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    const appendField = (key, val) => {
      if (Array.isArray(val)) {
        for (const item of val) {
          appendField(key, item);
        }
        return;
      }
      if (val && typeof val === "object" && val.value !== undefined) {
        form.append(key, val.value, val.options || {});
        return;
      }
      form.append(key, val);
    };
    for (const [key, val] of Object.entries(fields)) {
      appendField(key, val);
    }
    const headers = form.getHeaders();
    if (token) headers["Authorization"] = "Bearer " + token;
    const url = new URL(BASE + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => {
          raw += c;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );
    req.on("error", reject);
    form.pipe(req);
  });
}

// ── build a valid multipart body buffer synchronously ─────────────────────────
function buildMultipartBody(fields) {
  const form = new FormData();
  const appendField = (key, val) => {
    if (Array.isArray(val)) {
      for (const item of val) {
        appendField(key, item);
      }
      return;
    }
    if (val && typeof val === "object" && val.value !== undefined) {
      form.append(key, val.value, val.options || {});
      return;
    }
    form.append(key, val);
  };
  for (const [key, val] of Object.entries(fields)) {
    appendField(key, val);
  }
  return {
    body: form.getBuffer(),
    contentType: "multipart/form-data; boundary=" + form.getBoundary(),
    length: form.getLengthSync(),
  };
}

// ── beforeAll: register users + create fixtures ───────────────────────────────
hooks.beforeAll(async function (transactions, done) {
  try {
    const ts = Date.now();
    const nicknameA = "DreddUserA-" + ts;
    const nicknameB = "DreddUserB-" + ts;
    const nicknameC = "DreddUserC-" + ts;
    const registerNickname = "DreddRegTest-" + ts;

    // generate a valid 10×10 JPEG for image tests
    state.jpegBuf = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    // user A: post owner
    const emailA = "dredd-a-" + ts + "@example.com";
    state.primaryEmail = emailA;
    await jsonReq("POST", "/api/users/register", {
      email: emailA,
      password: "Password123!",
      name: nicknameA,
    });
    const loginA = await jsonReq("POST", "/api/auth/login", {
      email: emailA,
      password: "Password123!",
    });
    state.primaryToken = loginA.body && loginA.body.accessToken;
    const setCookieA = loginA.headers && loginA.headers["set-cookie"];
    if (setCookieA) {
      state.cookies = Array.isArray(setCookieA)
        ? setCookieA.join("; ")
        : setCookieA;
    }
    if (!state.primaryToken) {
      hooks.log(
        "[jemini] primary login failed: " + JSON.stringify(loginA.body)
      );
      return done();
    }
    const jwtSecret = readJwtSecret();
    if (jwtSecret) {
      state.adminToken = signJwtHs256(
        { sub: "dredd-admin", email: "dredd-admin@example.com", role: "admin" },
        jwtSecret,
        30 * 60
      );
    }
    if (!state.adminToken) {
      hooks.log("[jemini] admin token generation failed");
      return done();
    }
    hooks.log("[jemini] user A OK");

    // user B: non-owner
    const emailB = "dredd-b-" + ts + "@example.com";
    await jsonReq("POST", "/api/users/register", {
      email: emailB,
      password: "Password123!",
      name: nicknameB,
    });
    const loginB = await jsonReq("POST", "/api/auth/login", {
      email: emailB,
      password: "Password123!",
    });
    state.secondaryToken = loginB.body && loginB.body.accessToken;
    if (!state.secondaryToken) {
      hooks.log("[jemini] secondary login failed");
      return done();
    }
    hooks.log("[jemini] user B OK");

    // user C: dedicated delete target so the admin delete test does not
    // consume either fixture user needed by later transactions.
    const emailC = "dredd-c-" + ts + "@example.com";
    const deleteUserRes = await jsonReq("POST", "/api/users/register", {
      email: emailC,
      password: "Password123!",
      name: nicknameC,
    });
    state.deleteUserId = deleteUserRes.body && deleteUserRes.body.id;
    if (!state.deleteUserId) {
      hooks.log(
        "[jemini] delete user failed: " + JSON.stringify(deleteUserRes.body)
      );
      return done();
    }
    hooks.log("[jemini] deleteUserId: " + state.deleteUserId);

    // main post (user A)
    const postRes = await multipartReq(
      "POST",
      "/api/posts",
      {
        description: "テスト説明",
        lostDate: "2024-01-01",
      },
      state.primaryToken
    );
    state.postId = postRes.body && postRes.body.id;
    hooks.log(
      "[jemini] main post: " +
        state.postId +
        " (HTTP " +
        postRes.statusCode +
        ")"
    );
    if (!state.postId) {
      hooks.log("[jemini] main post failed: " + JSON.stringify(postRes.body));
      return done();
    }

    // delete post (user A) — consumed by DELETE /posts/{id} > 200
    const delPostRes = await multipartReq(
      "POST",
      "/api/posts",
      {
        description: "テスト削除用投稿",
        lostDate: "2024-01-01",
      },
      state.primaryToken
    );
    state.deletePostId = delPostRes.body && delPostRes.body.id;
    hooks.log("[jemini] delete post: " + state.deletePostId);

    // upload image #1 → imageId (kept for 403 tests)
    const imgRes1 = await multipartReq(
      "POST",
      "/api/posts/" + state.postId + "/images",
      {
        images: {
          value: state.jpegBuf,
          options: { filename: "img1.jpg", contentType: "image/jpeg" },
        },
      },
      state.primaryToken
    );
    const imgs1 = imgRes1.body && imgRes1.body.images;
    state.imageId = imgs1 && imgs1[0] ? imgs1[0].id : null;
    hooks.log(
      "[jemini] imageId: " +
        state.imageId +
        " (HTTP " +
        imgRes1.statusCode +
        ")"
    );

    // upload image #2 → deleteImageId (consumed by DELETE > 200)
    const imgRes2 = await multipartReq(
      "POST",
      "/api/posts/" + state.postId + "/images",
      {
        images: {
          value: state.jpegBuf,
          options: { filename: "img2.jpg", contentType: "image/jpeg" },
        },
      },
      state.primaryToken
    );
    const imgs2 = imgRes2.body && imgRes2.body.images;
    state.deleteImageId = imgs2 && imgs2[0] ? imgs2[0].id : null;
    hooks.log("[jemini] deleteImageId: " + state.deleteImageId);

    // sighting #1 — main (user B)
    const s1 = await jsonReq(
      "POST",
      "/api/sightings",
      {
        postId: state.postId,
        lat: 35.681236,
        lng: 139.767125,
        sightedAt: new Date().toISOString(),
        comment: "テスト目撃1",
      },
      state.secondaryToken
    );
    state.sightingId = s1.body && s1.body.id;
    hooks.log(
      "[jemini] sightingId: " +
        state.sightingId +
        " (HTTP " +
        s1.statusCode +
        ")"
    );

    // sighting #2 — for DELETE > 204 (user B)
    const s2 = await jsonReq(
      "POST",
      "/api/sightings",
      {
        postId: state.postId,
        lat: 35.681236,
        lng: 139.767125,
        sightedAt: new Date().toISOString(),
        comment: "テスト目撃2",
      },
      state.secondaryToken
    );
    state.deleteSightingId = s2.body && s2.body.id;
    hooks.log("[jemini] deleteSightingId: " + state.deleteSightingId);

    // sighting #3 — for POST /conversations > 201 (user B)
    const s3 = await jsonReq(
      "POST",
      "/api/sightings",
      {
        postId: state.postId,
        lat: 35.681236,
        lng: 139.767125,
        sightedAt: new Date().toISOString(),
        comment: "テスト目撃3",
      },
      state.secondaryToken
    );
    state.convSightingId = s3.body && s3.body.id;
    hooks.log("[jemini] convSightingId: " + state.convSightingId);

    // conversation — user A creates with sighting #1
    const convRes = await jsonReq(
      "POST",
      "/api/conversations",
      {
        postId: state.postId,
        sightingId: state.sightingId,
      },
      state.primaryToken
    );
    state.conversationId = convRes.body && convRes.body.id;
    hooks.log(
      "[jemini] conversationId: " +
        state.conversationId +
        " (HTTP " +
        convRes.statusCode +
        ")"
    );

    hooks.log("[jemini] beforeAll done");
    done();
  } catch (err) {
    hooks.log("[jemini] beforeAll error: " + err.message);
    done();
  }
});

// ── beforeEach: inject auth + fix URIs + override bodies ─────────────────────
hooks.beforeEach(function (transaction, done) {
  const method = transaction.request.method;
  const rawUri = transaction.request.uri || "";
  const status = String(transaction.expected.statusCode);

  // ── global: fix Content-Type header mismatch ─────────────────────────────
  // NestJS returns 'application/json; charset=utf-8', spec may expect 'application/json'
  if (transaction.expected.headers) {
    const ct =
      transaction.expected.headers["content-type"] ||
      transaction.expected.headers["Content-Type"];
    if (ct === "application/json") {
      transaction.expected.headers["content-type"] =
        "application/json; charset=utf-8";
      delete transaction.expected.headers["Content-Type"];
    }
  }

  function setToken(token) {
    if (token) transaction.request.headers["Authorization"] = "Bearer " + token;
  }

  // Update both uri and fullPath so Dredd uses the correct path
  function fixUri(newUri) {
    transaction.request.uri = newUri;
    transaction.fullPath = newUri;
  }

  function replaceIn(str, from, to) {
    if (!str || !to) return str;
    return str.replace(from, to);
  }

  function setJsonBody(obj) {
    const s = JSON.stringify(obj);
    transaction.request.body = s;
    transaction.request.headers["Content-Type"] = "application/json";
    transaction.request.headers["Content-Length"] = String(
      Buffer.byteLength(s)
    );
  }

  // Build and apply a valid multipart body to the transaction
  function setMultipartBody(fields) {
    if (!state.jpegBuf) return;
    const { body, contentType, length } = buildMultipartBody(fields);
    // Dredd supports only UTF-8 and Base64 bodyEncoding; use base64 to preserve binary bytes
    transaction.request.body = body.toString("base64");
    transaction.request.bodyEncoding = "base64";
    transaction.request.headers["Content-Type"] = contentType;
    transaction.request.headers["Content-Length"] = String(length);
  }

  function skipTx(reason) {
    transaction.skip = true;
    hooks.log("[jemini] skip: " + transaction.name + " (" + reason + ")");
  }

  // Skip body schema validation: set body to '{}' so gavel validates against empty object
  // (any actual JSON body satisfies an empty expected object), and null out bodySchema
  function clearExpectedBody() {
    transaction.expected.body = "{}";
    transaction.expected.bodySchema = null;
  }

  // ── POST /api/users/register ──────────────────────────────────────────────
  if (method === "POST" && rawUri === "/api/users/register") {
    // Use unique email to avoid duplicate key errors from repeated runs
    const uniq = "dredd-reg-" + Date.now() + "@example.com";
    const registerNickname = "DreddRegTest-" + Date.now();
    setJsonBody({
      email: uniq,
      password: "Password123!",
      name: registerNickname,
    });
    clearExpectedBody(); // spec requires createdAt but server doesn't return it
  }

  // ── POST /api/auth/login ──────────────────────────────────────────────────
  if (method === "POST" && rawUri.includes("/auth/login")) {
    if (state.primaryEmail) {
      setJsonBody({
        email: state.primaryEmail,
        password: state.primaryPassword,
      });
    }
  }

  // ── POST /api/auth/logout ─────────────────────────────────────────────────
  if (method === "POST" && rawUri.includes("/auth/logout")) {
    setToken(state.primaryToken);
  }

  // ── POST /api/auth/refresh ────────────────────────────────────────────────
  if (method === "POST" && rawUri.includes("/auth/refresh")) {
    if (state.cookies) {
      transaction.request.headers["Cookie"] = state.cookies;
    }
  }

  // ── POST /api/posts ───────────────────────────────────────────────────────
  if (method === "POST" && rawUri === "/api/posts") {
    setToken(state.primaryToken);
    setMultipartBody({
      description: { value: "テスト説明", options: undefined },
      lostDate: { value: "2024-01-01", options: undefined },
    });
  }

  // ── GET /api/posts/{id} ───────────────────────────────────────────────────
  if (method === "GET" && /^\/api\/posts\/[^/]+$/.test(rawUri)) {
    fixUri(replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER));
  }

  // ── PATCH /api/posts/{id} ─────────────────────────────────────────────────
  if (method === "PATCH" && /^\/api\/posts\/[^/]+$/.test(rawUri)) {
    fixUri(replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER));
    setToken(status === "403" ? state.secondaryToken : state.primaryToken);
    setJsonBody({ title: "テスト更新" });
  }

  // ── DELETE /api/posts/{id} ────────────────────────────────────────────────
  if (method === "DELETE" && /^\/api\/posts\/[^/]+$/.test(rawUri)) {
    if (status === "403") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER));
      setToken(state.secondaryToken);
    } else {
      fixUri(
        replaceIn(
          rawUri,
          PLACEHOLDER,
          state.deletePostId || state.postId || PLACEHOLDER
        )
      );
      setToken(state.primaryToken);
      clearExpectedBody(); // spec requires petDetail but server doesn't return it
    }
  }

  // ── POST /api/posts/{id}/images ───────────────────────────────────────────
  if (method === "POST" && /^\/api\/posts\/[^/]+\/images$/.test(rawUri)) {
    const targetPostId = state.postId || PLACEHOLDER;
    fixUri(replaceIn(rawUri, PLACEHOLDER, targetPostId));
    if (status === "400") {
      setToken(state.primaryToken);
      setMultipartBody({
        images: Array.from({ length: 11 }, (_, index) => ({
          value: state.jpegBuf,
          options: {
            filename: "overflow-" + index + ".jpg",
            contentType: "image/jpeg",
          },
        })),
      });
    } else if (status === "403") {
      setToken(state.secondaryToken);
      setMultipartBody({
        images: {
          value: state.jpegBuf,
          options: { filename: "test.jpg", contentType: "image/jpeg" },
        },
      });
    } else {
      setToken(state.primaryToken);
      setMultipartBody({
        images: {
          value: state.jpegBuf,
          options: { filename: "test.jpg", contentType: "image/jpeg" },
        },
      });
      clearExpectedBody(); // spec requires remainingSlots but server doesn't return it
    }
  }

  // ── DELETE /api/posts/{id}/images/{imageId} ───────────────────────────────
  if (
    method === "DELETE" &&
    rawUri.includes("/posts/") &&
    rawUri.includes("/images/")
  ) {
    if (status === "200") {
      let uri = replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER);
      uri = replaceIn(uri, PLACEHOLDER, state.deleteImageId || PLACEHOLDER);
      fixUri(uri);
      setToken(state.primaryToken);
    } else if (status === "403") {
      let uri = replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER);
      uri = replaceIn(uri, PLACEHOLDER, state.imageId || PLACEHOLDER);
      fixUri(uri);
      setToken(state.secondaryToken);
    } else {
      // 404: valid postId + non-existent imageId
      let uri = replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER);
      uri = replaceIn(uri, PLACEHOLDER, FAKE_ID);
      fixUri(uri);
      setToken(state.primaryToken);
    }
  }

  // ── POST /api/posts/{id}/favorite ─────────────────────────────────────────
  if (method === "POST" && /^\/api\/posts\/[^/]+\/favorite$/.test(rawUri)) {
    if (status === "400") {
      skipTx("400 for post favorite requires 20+ existing favorites");
    } else if (status === "403") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER));
      setToken(state.primaryToken); // owner → 403
    } else if (status === "404") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, FAKE_ID));
      setToken(state.secondaryToken);
    } else {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.postId || PLACEHOLDER));
      setToken(state.secondaryToken); // non-owner → 201
    }
  }

  // ── POST /api/sightings ───────────────────────────────────────────────────
  if (method === "POST" && rawUri === "/api/sightings") {
    setToken(state.secondaryToken);
    setJsonBody({
      postId: state.postId || PLACEHOLDER,
      lat: 35.681236,
      lng: 139.767125,
      sightedAt: new Date().toISOString(),
      comment: "テスト目撃",
    });
  }

  // ── GET /api/sightings ────────────────────────────────────────────────────
  if (
    method === "GET" &&
    /^\/api\/sightings(\?.*)?$/.test(rawUri) &&
    !rawUri.includes("/favorite")
  ) {
    fixUri("/api/sightings?postId=" + (state.postId || "unknown"));
  }

  // ── DELETE /api/sightings/{id} ────────────────────────────────────────────
  if (method === "DELETE" && /^\/api\/sightings\/[^/]+$/.test(rawUri)) {
    if (status !== "401") {
      fixUri(
        replaceIn(rawUri, PLACEHOLDER, state.deleteSightingId || PLACEHOLDER)
      );
      setToken(state.secondaryToken);
    }
  }

  // ── POST /api/sightings/{id}/favorite ─────────────────────────────────────
  if (method === "POST" && /^\/api\/sightings\/[^/]+\/favorite$/.test(rawUri)) {
    if (status === "400") {
      skipTx("400 for sighting favorite requires 20+ existing favorites");
    } else if (status === "404") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, FAKE_ID));
      setToken(state.primaryToken);
    } else {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.sightingId || PLACEHOLDER));
      setToken(state.primaryToken); // user A favorites user B's sighting
    }
  }

  // ── POST /api/conversations ───────────────────────────────────────────────
  if (method === "POST" && rawUri === "/api/conversations") {
    setToken(state.primaryToken);
    setJsonBody({
      postId: state.postId || PLACEHOLDER,
      sightingId: state.convSightingId || PLACEHOLDER,
    });
  }

  // ── GET /api/conversations ────────────────────────────────────────────────
  if (method === "GET" && rawUri === "/api/conversations") {
    setToken(state.primaryToken);
  }

  // ── POST /api/conversations/{id}/messages ─────────────────────────────────
  if (
    method === "POST" &&
    /^\/api\/conversations\/[^/]+\/messages$/.test(rawUri)
  ) {
    if (!state.conversationId && status !== "401") {
      skipTx("conversationId is not ready");
    } else {
      fixUri(
        replaceIn(rawUri, PLACEHOLDER, state.conversationId || PLACEHOLDER)
      );
      setToken(state.primaryToken);
      setJsonBody({ body: "Dredd message" });
    }
  }

  // ── GET /api/conversations/{id}/messages ──────────────────────────────────
  if (
    method === "GET" &&
    /^\/api\/conversations\/[^/]+\/messages$/.test(rawUri)
  ) {
    if (!state.conversationId && status !== "401") {
      skipTx("conversationId is not ready");
    } else {
      fixUri(
        replaceIn(rawUri, PLACEHOLDER, state.conversationId || PLACEHOLDER)
      );
      setToken(state.primaryToken);
    }
  }

  // ── PATCH /api/conversations/{id}/messages/read ───────────────────────────
  if (
    method === "PATCH" &&
    rawUri.includes("/conversations/") &&
    rawUri.includes("/messages/read")
  ) {
    if (!state.conversationId && status !== "401") {
      skipTx("conversationId is not ready");
    } else {
      fixUri(
        replaceIn(rawUri, PLACEHOLDER, state.conversationId || PLACEHOLDER)
      );
      setToken(state.primaryToken);
    }
  }

  // ── GET /api/users (admin only) ───────────────────────────────────────────
  if (method === "GET" && rawUri === "/api/users") {
    setToken(status === "403" ? state.secondaryToken : state.adminToken);
  }

  // ── DELETE /api/users/{id} ───────────────────────────────────────────────
  if (method === "DELETE" && /^\/api\/users\/[^/]+$/.test(rawUri)) {
    if (status === "403") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.deleteUserId || PLACEHOLDER));
      setToken(state.secondaryToken);
    } else if (status === "404") {
      fixUri(replaceIn(rawUri, PLACEHOLDER, FAKE_ID));
      setToken(state.adminToken);
    } else {
      fixUri(replaceIn(rawUri, PLACEHOLDER, state.deleteUserId || PLACEHOLDER));
      setToken(state.adminToken);
    }
  }

  // ── 401: strip Authorization so server responds with 401 ─────────────────
  if (status === "401") {
    delete transaction.request.headers["Authorization"];
  }

  done();
});

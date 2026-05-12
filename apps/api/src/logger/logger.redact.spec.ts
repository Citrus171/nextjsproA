import pino from "pino";
import { Writable } from "stream";
import { REDACT_PATHS } from "./logger.module";

const captureLog = (paths: string[], obj: object): Record<string, unknown> => {
  let output = "";
  const dest = new Writable({
    write(chunk, _enc, cb) {
      output += chunk.toString();
      cb();
    },
  });
  const logger = pino({ redact: { paths, censor: "[Redacted]" } }, dest);
  logger.info(obj, "test");
  return JSON.parse(output) as Record<string, unknown>;
};

describe("REDACT_PATHS — PII マスキング", () => {
  it("req.headers.authorization が [Redacted] になること", () => {
    const log = captureLog(REDACT_PATHS, {
      req: { headers: { authorization: "Bearer secret-token" } },
    });
    expect(
      (log.req as Record<string, Record<string, string>>).headers.authorization
    ).toBe("[Redacted]");
  });

  it("req.headers.cookie が [Redacted] になること", () => {
    const log = captureLog(REDACT_PATHS, {
      req: { headers: { cookie: "refreshToken=abc123" } },
    });
    expect(
      (log.req as Record<string, Record<string, string>>).headers.cookie
    ).toBe("[Redacted]");
  });

  it("req.body.password が [Redacted] になること", () => {
    const log = captureLog(REDACT_PATHS, {
      req: { body: { password: "super-secret" } },
    });
    expect(
      (log.req as Record<string, Record<string, string>>).body.password
    ).toBe("[Redacted]");
  });

  it("res.headers['set-cookie'] が [Redacted] になること", () => {
    const log = captureLog(REDACT_PATHS, {
      res: { headers: { "set-cookie": "refreshToken=xyz; HttpOnly" } },
    });
    expect(
      (log.res as Record<string, Record<string, string>>).headers["set-cookie"]
    ).toBe("[Redacted]");
  });

  it("lat/lng（位置情報）はマスクされないこと", () => {
    const log = captureLog(REDACT_PATHS, {
      body: { lat: 35.6762, lng: 139.6503 },
    });
    expect((log.body as Record<string, number>).lat).toBe(35.6762);
    expect((log.body as Record<string, number>).lng).toBe(139.6503);
  });
});

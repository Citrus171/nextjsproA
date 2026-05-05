import { ConfigService } from "@nestjs/config";
import { CryptoService } from "./crypto.service";

describe("CryptoService", () => {
  let service: CryptoService;
  const TEST_KEY_V1_B64 = Buffer.alloc(32, 0xab).toString("base64");
  const TEST_KEY_V2_B64 = Buffer.alloc(32, 0xcd).toString("base64");
  const TEST_HMAC = "test-hmac-secret";

  function makeConfig(currentKeyId = "v1") {
    const get = (key: string) => {
      if (key === "ENCRYPTION_KEY_V1") return TEST_KEY_V1_B64;
      if (key === "HMAC_SECRET") return TEST_HMAC;
      return undefined;
    };
    return {
      get: jest.fn(get),
      getOrThrow: jest.fn((key: string) => {
        if (key === "ENCRYPTION_KEY_CURRENT") return currentKeyId;
        if (key === "HMAC_SECRET") return TEST_HMAC;
        throw new Error(`Config key ${key} not found`);
      }),
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    service = new CryptoService(makeConfig());
  });

  describe("normalizeEmail", () => {
    it("大文字を小文字にし、前後空白を除去すること", () => {
      expect(service.normalizeEmail("  User@Example.COM  ")).toBe(
        "user@example.com"
      );
    });

    it("既に正規化済みのメールアドレスはそのまま返すこと", () => {
      expect(service.normalizeEmail("user@example.com")).toBe(
        "user@example.com"
      );
    });
  });

  describe("encryptEmail / decryptEmail", () => {
    it("暗号化して復号すると元のメールアドレスに戻ること", () => {
      const plain = "user@example.com";
      const encrypted = service.encryptEmail(plain);
      expect(encrypted).not.toBe(plain);
      expect(service.decryptEmail(encrypted)).toBe(plain);
    });

    it("暗号文が keyId:iv:enc:tag の4パーツフォーマットであること", () => {
      const a = service.encryptEmail("a@example.com");
      const b = service.encryptEmail("b@example.com");
      expect(a).not.toBe(b);
      expect(a.split(":")).toHaveLength(4);
      expect(a.split(":")[0]).toBe("v1");
    });

    it("復号: 壊れたデータは null を返すこと", () => {
      expect(service.decryptEmail("invalid")).toBeNull();
      expect(service.decryptEmail("")).toBeNull();
    });

    it("復号: 存在しない keyId の暗号文は null を返すこと", () => {
      expect(service.decryptEmail("v99:iv:enc:tag")).toBeNull();
    });

    it("復号: 旧形式（3パーツ）の暗号文は null を返すこと", () => {
      expect(service.decryptEmail("iv:enc:tag")).toBeNull();
    });
  });

  describe("複数鍵サポート", () => {
    function makeMultiKeyConfig() {
      const get = (key: string) => {
        if (key === "ENCRYPTION_KEY_V1") return TEST_KEY_V1_B64;
        if (key === "ENCRYPTION_KEY_V2") return TEST_KEY_V2_B64;
        if (key === "HMAC_SECRET") return TEST_HMAC;
        return undefined;
      };
      return {
        get: jest.fn(get),
        getOrThrow: jest.fn((key: string) => {
          if (key === "ENCRYPTION_KEY_CURRENT") return "v2";
          if (key === "HMAC_SECRET") return TEST_HMAC;
          throw new Error(`Config key ${key} not found`);
        }),
      } as unknown as ConfigService;
    }

    it("ENCRYPTION_KEY_CURRENTがv2の時、暗号化結果がv2プレフィックスを持つこと", () => {
      const svc = new CryptoService(makeMultiKeyConfig());
      const enc = svc.encryptEmail("user@example.com");
      expect(enc.split(":")[0]).toBe("v2");
    });

    it("v2で暗号化したデータをv2鍵で復号できること", () => {
      const svc = new CryptoService(makeMultiKeyConfig());
      const enc = svc.encryptEmail("user@example.com");
      expect(svc.decryptEmail(enc)).toBe("user@example.com");
    });

    it("v1で暗号化したデータをv1鍵で復号できること（v2が現在鍵でも）", () => {
      const svcV1 = new CryptoService(makeConfig("v1"));
      const encByV1 = svcV1.encryptEmail("user@example.com");

      const svcV2Current = new CryptoService(makeMultiKeyConfig());
      expect(svcV2Current.decryptEmail(encByV1)).toBe("user@example.com");
    });
  });

  describe("鍵バージョニングバリデーション", () => {
    function makeConfigWithKey(keyV1: string, currentKeyId = "v1") {
      return {
        get: jest.fn((k: string) =>
          k === "ENCRYPTION_KEY_V1" ? keyV1 : undefined
        ),
        getOrThrow: jest.fn((k: string) => {
          if (k === "ENCRYPTION_KEY_CURRENT") return currentKeyId;
          if (k === "HMAC_SECRET") return TEST_HMAC;
          throw new Error(`Config key ${k} not found`);
        }),
      } as unknown as ConfigService;
    }

    it("32バイト未満のbase64キーはエラーになること", () => {
      const shortKey = Buffer.alloc(16, 0xab).toString("base64");
      const svc = new CryptoService(makeConfigWithKey(shortKey));
      expect(() => svc.encryptEmail("test@example.com")).toThrow(/32 バイト/);
    });

    it("32バイト超のbase64キーはエラーになること", () => {
      const longKey = Buffer.alloc(40, 0xab).toString("base64");
      const svc = new CryptoService(makeConfigWithKey(longKey));
      expect(() => svc.encryptEmail("test@example.com")).toThrow(/32 バイト/);
    });

    it("正しい32バイトbase64キーは正常に動作すること", () => {
      const svc = new CryptoService(makeConfigWithKey(TEST_KEY_V1_B64));
      const enc = svc.encryptEmail("test@example.com");
      expect(svc.decryptEmail(enc)).toBe("test@example.com");
    });

    it("onModuleInit で不正キーがあれば起動時にエラーになること", () => {
      const shortKey = Buffer.alloc(10, 0xab).toString("base64");
      const svc = new CryptoService(makeConfigWithKey(shortKey));
      expect(() => svc.onModuleInit()).toThrow(/32 バイト/);
    });

    it("ENCRYPTION_KEY_CURRENTが存在しない鍵IDを指す場合にエラーになること", () => {
      const svc = new CryptoService(makeConfigWithKey(TEST_KEY_V1_B64, "v99"));
      expect(() => svc.encryptEmail("test@example.com")).toThrow(
        /ENCRYPTION_KEY_CURRENT/
      );
    });
  });

  describe("hmacEmail", () => {
    it("同じ入力に対して同じHMACを生成すること（決定性）", () => {
      const h1 = service.hmacEmail("user@example.com");
      const h2 = service.hmacEmail("user@example.com");
      expect(h1).toBe(h2);
    });

    it("異なる入力に対して異なるHMACを生成すること", () => {
      const h1 = service.hmacEmail("a@example.com");
      const h2 = service.hmacEmail("b@example.com");
      expect(h1).not.toBe(h2);
    });

    it("正規化されたメールアドレスに対してのみ使われること", () => {
      const h = service.hmacEmail("user@example.com");
      expect(h).toHaveLength(64); // SHA256 hex = 64 chars
    });
  });

  describe("sha256Hex", () => {
    it("同じ入力に対して同じハッシュを生成すること", () => {
      const h1 = service.sha256Hex("hello");
      const h2 = service.sha256Hex("hello");
      expect(h1).toBe(h2);
    });

    it("異なる入力に対して異なるハッシュを生成すること", () => {
      const h1 = service.sha256Hex("hello");
      const h2 = service.sha256Hex("world");
      expect(h1).not.toBe(h2);
    });

    it("SHA256ハッシュは64文字の16進数であること", () => {
      const h = service.sha256Hex("test");
      expect(h).toHaveLength(64);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("generateSecureToken", () => {
    it("96文字の16進数文字列を生成すること (48 bytes)", () => {
      const token = service.generateSecureToken();
      expect(token).toHaveLength(96);
      expect(token).toMatch(/^[0-9a-f]{96}$/);
    });

    it("毎回異なるトークンを生成すること", () => {
      const t1 = service.generateSecureToken();
      const t2 = service.generateSecureToken();
      expect(t1).not.toBe(t2);
    });
  });
});

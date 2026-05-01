import { ConfigService } from "@nestjs/config";
import { CryptoService } from "./crypto.service";

describe("CryptoService", () => {
  let service: CryptoService;
  const TEST_KEY_B64 = Buffer.alloc(32, 0xab).toString("base64");
  const TEST_HMAC = "test-hmac-secret";

  function makeConfig() {
    const get = (key: string) => {
      if (key === "ENCRYPTION_KEY") return TEST_KEY_B64;
      if (key === "HMAC_SECRET") return TEST_HMAC;
      return undefined;
    };
    return {
      get: jest.fn(get),
      getOrThrow: jest.fn((key: string) => {
        const v = get(key);
        if (v === undefined) throw new Error(`Config key ${key} not found`);
        return v;
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

    it("異なる平文は異なる暗号文を生成すること", () => {
      const a = service.encryptEmail("a@example.com");
      const b = service.encryptEmail("b@example.com");
      // IVがランダムなので暗号文全体は異なる
      expect(a).not.toBe(b);
      // ただしコロン区切り構造は同じ
      expect(a.split(":")).toHaveLength(3);
    });

    it("復号: 壊れたデータは null を返すこと", () => {
      expect(service.decryptEmail("invalid")).toBeNull();
      expect(service.decryptEmail("too:many:parts:extra")).toBeNull();
      expect(service.decryptEmail("")).toBeNull();
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

  describe("deriveEncryptionKey (ENCRYPTION_KEY バリデーション)", () => {
    function makeConfigWithKey(key: string) {
      return {
        get: jest.fn((k: string) => (k === "ENCRYPTION_KEY" ? key : undefined)),
        getOrThrow: jest.fn((k: string) => {
          if (k === "ENCRYPTION_KEY") return key;
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

    it("base64でない文字列（utf8平文）はエラーになること", () => {
      const svc = new CryptoService(makeConfigWithKey("password"));
      expect(() => svc.encryptEmail("test@example.com")).toThrow(/32 バイト/);
    });

    it("正しい32バイトbase64キーは正常に動作すること", () => {
      const svc = new CryptoService(makeConfigWithKey(TEST_KEY_B64));
      const enc = svc.encryptEmail("test@example.com");
      expect(svc.decryptEmail(enc)).toBe("test@example.com");
    });

    it("onModuleInit で不正キーがあれば起動時にエラーになること", () => {
      const shortKey = Buffer.alloc(10, 0xab).toString("base64");
      const svc = new CryptoService(makeConfigWithKey(shortKey));
      expect(() => svc.onModuleInit()).toThrow(/32 バイト/);
    });
  });
});

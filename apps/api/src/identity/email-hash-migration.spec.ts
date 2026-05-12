import { migrateEmailHashToHmac } from "./email-hash-migration";

const mockCrypto = {
  normalizeEmail: jest.fn((e: string) => e.toLowerCase().trim()),
  decryptEmail: jest.fn(),
  hmacEmail: jest.fn(),
};

function makePrisma(users: unknown[] = []) {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue(users),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("migrateEmailHashToHmac", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("基本動作", () => {
    it("ユーザーが0件の時、全カウントが0の結果を返すこと", async () => {
      const prisma = makePrisma([]);

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result).toEqual({ total: 0, migrated: 0, skipped: 0, errors: 0 });
    });
  });

  describe("HMACへの更新", () => {
    it("SHA256ハッシュのユーザーがHMACに更新されること", async () => {
      const sha256Hash = "a".repeat(64);
      const hmacHash = "b".repeat(64);
      const users = [
        {
          id: "user-1",
          emailEncrypted: "enc-email",
          emailHash: sha256Hash,
        },
      ];
      const prisma = makePrisma(users);
      mockCrypto.decryptEmail.mockReturnValue("user@example.com");
      mockCrypto.hmacEmail.mockReturnValue(hmacHash);

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { emailHash: hmacHash },
      });
    });

    it("既にHMACのユーザーはスキップされること（冪等）", async () => {
      const hmacHash = "c".repeat(64);
      const users = [
        {
          id: "user-2",
          emailEncrypted: "enc-email",
          emailHash: hmacHash,
        },
      ];
      const prisma = makePrisma(users);
      mockCrypto.decryptEmail.mockReturnValue("user@example.com");
      mockCrypto.hmacEmail.mockReturnValue(hmacHash); // 同じハッシュ

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("dry-runモード", () => {
    it("dry-runの時、DBを更新せず結果のみ返すこと", async () => {
      const users = [
        {
          id: "user-1",
          emailEncrypted: "enc-email",
          emailHash: "sha256-hash",
        },
      ];
      const prisma = makePrisma(users);
      mockCrypto.decryptEmail.mockReturnValue("user@example.com");
      mockCrypto.hmacEmail.mockReturnValue("hmac-hash");

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any,
        { dryRun: true }
      );

      expect(result.migrated).toBe(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("スキップケース", () => {
    it("emailEncryptedがnullのユーザーはスキップされること", async () => {
      const users: Record<string, unknown>[] = [
        { id: "user-3", emailEncrypted: null, emailHash: "any-hash" },
      ];
      const prisma = makePrisma(users);

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("復号に失敗したユーザーはエラーカウントされること", async () => {
      const users = [
        { id: "user-4", emailEncrypted: "broken-enc", emailHash: "any-hash" },
      ];
      const prisma = makePrisma(users);
      mockCrypto.decryptEmail.mockReturnValue(null); // 復号失敗

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result.errors).toBe(1);
      expect(result.migrated).toBe(0);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("複数ユーザー混在", () => {
    it("SHA256・HMAC済み・null混在の時、それぞれ正しくカウントされること", async () => {
      const hmacHash = "hmac".repeat(16);
      const users = [
        { id: "u1", emailEncrypted: "enc1", emailHash: "sha256-hash" }, // 要更新
        { id: "u2", emailEncrypted: "enc2", emailHash: hmacHash }, // スキップ
        { id: "u3", emailEncrypted: null, emailHash: "any" }, // スキップ
      ];
      const prisma = makePrisma(users);
      mockCrypto.decryptEmail.mockReturnValue("user@example.com");
      mockCrypto.hmacEmail
        .mockReturnValueOnce(hmacHash + "x") // u1: 異なるのでmigrate
        .mockReturnValueOnce(hmacHash); // u2: 同じのでskip

      const result = await migrateEmailHashToHmac(
        prisma as any,
        mockCrypto as any
      );

      expect(result.total).toBe(3);
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(2);
      expect(result.errors).toBe(0);
    });
  });
});

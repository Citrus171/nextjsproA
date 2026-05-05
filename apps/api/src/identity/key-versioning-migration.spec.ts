import { migrateKeyVersioning } from "./key-versioning-migration";

function makePrisma(users: unknown[] = []) {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue(users),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("migrateKeyVersioning", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("基本動作", () => {
    it("ユーザーが0件の時、全カウントが0の結果を返すこと", async () => {
      const prisma = makePrisma([]);
      const result = await migrateKeyVersioning(prisma as never);
      expect(result).toEqual({ total: 0, migrated: 0, skipped: 0, errors: 0 });
    });
  });

  describe("プレフィックス付与", () => {
    it("旧形式（iv:enc:tag）の暗号文にv1プレフィックスを付与すること", async () => {
      const users = [{ id: "u1", emailEncrypted: "aabbcc:ddeeff:112233" }];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.migrated).toBe(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { emailEncrypted: "v1:aabbcc:ddeeff:112233" },
      });
    });

    it("既にv1プレフィックス付きの暗号文はスキップされること（冪等）", async () => {
      const users = [{ id: "u2", emailEncrypted: "v1:aabbcc:ddeeff:112233" }];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("emailEncryptedがnullのユーザーはスキップされること", async () => {
      const users = [{ id: "u3", emailEncrypted: null }];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("dry-runモード", () => {
    it("dry-runの時、DBを更新せず変換件数のみ返すこと", async () => {
      const users = [{ id: "u1", emailEncrypted: "aabbcc:ddeeff:112233" }];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never, {
        dryRun: true,
      });

      expect(result.migrated).toBe(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    it("DB更新が失敗した場合にエラーカウントされること", async () => {
      const users = [{ id: "u4", emailEncrypted: "aabbcc:ddeeff:112233" }];
      const prisma = makePrisma(users);
      prisma.user.update.mockRejectedValue(new Error("DB error"));

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.errors).toBe(1);
      expect(result.migrated).toBe(0);
    });

    it("無効なフォーマット（パーツ数が3以外）はエラーカウントされること", async () => {
      const users = [{ id: "u5", emailEncrypted: "broken" }];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.errors).toBe(1);
      expect(result.migrated).toBe(0);
    });
  });

  describe("複数ユーザー混在", () => {
    it("旧形式・新形式・null混在の時それぞれ正しくカウントされること", async () => {
      const users = [
        { id: "u1", emailEncrypted: "iv1:enc1:tag1" }, // 要更新
        { id: "u2", emailEncrypted: "v1:iv2:enc2:tag2" }, // スキップ（既存v1）
        { id: "u3", emailEncrypted: null }, // スキップ
      ];
      const prisma = makePrisma(users);

      const result = await migrateKeyVersioning(prisma as never);

      expect(result.total).toBe(3);
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(2);
      expect(result.errors).toBe(0);
    });
  });
});

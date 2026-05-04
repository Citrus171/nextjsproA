export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

export interface MigrationOptions {
  dryRun?: boolean;
}

interface MigrationCrypto {
  normalizeEmail(email: string): string;
  decryptEmail(encrypted: string): string | null;
  hmacEmail(normalized: string): string;
}

interface MigrationPrisma {
  user: {
    findMany(args: { select: Record<string, boolean> }): Promise<
      Array<{
        id: string;
        emailEncrypted: string | null;
        emailHash: string | null;
      }>
    >;
    update(args: {
      where: { id: string };
      data: { emailHash: string };
    }): Promise<unknown>;
  };
}

export async function migrateEmailHashToHmac(
  prisma: MigrationPrisma,
  crypto: MigrationCrypto,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const { dryRun = false } = options;
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  const users = await prisma.user.findMany({
    select: { id: true, emailEncrypted: true, emailHash: true },
  });
  result.total = users.length;

  for (const user of users) {
    if (!user.emailEncrypted) {
      result.skipped++;
      continue;
    }

    const plain = crypto.decryptEmail(user.emailEncrypted);
    if (!plain) {
      result.errors++;
      continue;
    }

    const normalized = crypto.normalizeEmail(plain);
    const hmac = crypto.hmacEmail(normalized);

    if (user.emailHash === hmac) {
      result.skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailHash: hmac },
      });
    }
    result.migrated++;
  }

  return result;
}

export interface KeyVersioningMigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

export interface KeyVersioningMigrationOptions {
  dryRun?: boolean;
  targetKeyId?: string;
}

interface MigrationPrisma {
  user: {
    findMany(args: {
      select: Record<string, boolean>;
    }): Promise<Array<{ id: string; emailEncrypted: string | null }>>;
    update(args: {
      where: { id: string };
      data: { emailEncrypted: string };
    }): Promise<unknown>;
  };
}

const KEY_ID_PATTERN = /^v\d+:/;

async function processUser(
  user: { id: string; emailEncrypted: string | null },
  prisma: MigrationPrisma,
  result: KeyVersioningMigrationResult,
  dryRun: boolean,
  targetKeyId: string
): Promise<void> {
  if (!user.emailEncrypted) {
    result.skipped++;
    return;
  }

  if (KEY_ID_PATTERN.test(user.emailEncrypted)) {
    result.skipped++;
    return;
  }

  const parts = user.emailEncrypted.split(":");
  if (parts.length !== 3) {
    result.errors++;
    return;
  }

  const newValue = `${targetKeyId}:${user.emailEncrypted}`;

  if (!dryRun) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailEncrypted: newValue },
      });
    } catch {
      result.errors++;
      return;
    }
  }
  result.migrated++;
}

export async function migrateKeyVersioning(
  prisma: MigrationPrisma,
  options: KeyVersioningMigrationOptions = {}
): Promise<KeyVersioningMigrationResult> {
  const { dryRun = false, targetKeyId = "v1" } = options;
  const result: KeyVersioningMigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  const users = await prisma.user.findMany({
    select: { id: true, emailEncrypted: true },
  });
  result.total = users.length;

  for (const user of users) {
    await processUser(user, prisma, result, dryRun, targetKeyId);
  }

  return result;
}

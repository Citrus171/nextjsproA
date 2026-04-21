import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcrypt";
import {
  normalizeEmail,
  hmacEmail,
  encryptEmail,
  decryptEmail,
  sha256Hex,
} from "../utils/crypto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string, name: string) {
    const hashed = await bcrypt.hash(password, 10);
    const normalized = normalizeEmail(email);
    const emailHash = hmacEmail(normalized);
    const emailEncrypted = encryptEmail(normalized);

    try {
      const user = await (this.prisma.user as any).create({
        data: {
          emailEncrypted,
          emailHash,
          password: hashed,
          nickname: name,
        },
      });
      return {
        ...user,
        email: normalized,
      };
    } catch (e: any) {
      if (e?.code === "P2002") {
        const target = Array.isArray(e.meta?.target)
          ? e.meta.target.map(String).join(" ").toLowerCase()
          : "";
        if (target.includes("nickname")) {
          throw new ConflictException(
            "このニックネームはすでに使用されています"
          );
        }
        if (target.includes("email") || target.includes("emailhash")) {
          throw new BadRequestException(
            "このメールアドレスはすでに使用されています"
          );
        }
        throw new ConflictException("重複したデータが存在します");
      }
      throw e;
    }
  }

  async findByEmail(email: string) {
    const normalized = normalizeEmail(email);
    const hmac = hmacEmail(normalized);
    const sha = sha256Hex(normalized);
    // Try HMAC first, fallback to SHA256 (transitional for existing rows)
    let user = await (this.prisma.user as any).findUnique({
      where: { emailHash: hmac },
    });
    if (!user) {
      user = await (this.prisma.user as any).findUnique({
        where: { emailHash: sha },
      });
    }
    if (!user) return null;
    // attach decrypted email if possible
    let emailDec = null;
    try {
      emailDec = user.emailEncrypted ? decryptEmail(user.emailEncrypted) : null;
    } catch (e) {
      emailDec = null;
    }
    return { ...user, email: emailDec ?? normalizeEmail(email) };
  }

  async findById(id: string) {
    const user = await (this.prisma.user as any).findUnique({ where: { id } });
    if (!user) return null;
    let emailDec = null;
    try {
      emailDec = user.emailEncrypted ? decryptEmail(user.emailEncrypted) : null;
    } catch (e) {
      emailDec = null;
    }
    return { ...user, email: emailDec };
  }
  // TanStack Start との対比用: DB から全ユーザーを取得（パスワード除外）
  // TanStack Start: export const getUsers = createServerFn(async () => db.user.findMany())
  // NestJS:  この1行が「サーバー関数の中身」に相当する
  async findAll() {
    const users = await (this.prisma.user as any).findMany({
      select: {
        id: true,
        emailEncrypted: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.emailEncrypted ? decryptEmail(u.emailEncrypted) : null,
      nickname: u.nickname,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
      select: { id: true, nickname: true, role: true, createdAt: true },
    });
  }
}

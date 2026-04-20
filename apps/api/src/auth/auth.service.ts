import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/user.service";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";
import { decryptEmail } from "../utils/crypto";

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(pass, user.password);
    if (match) return { id: user.id, email: user.email, role: user.role };
    return null;
  }

  async createRefreshToken(userId: string) {
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000); // 30 days
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
    return token;
  }

  async rotateRefreshToken(oldToken: string) {
    const rec = await (this.prisma.refreshToken as any).findUnique({
      where: { token: oldToken },
      include: { user: { select: { emailEncrypted: true, role: true } } },
    });
    if (!rec || rec.expiresAt <= new Date()) return null;
    await this.prisma.refreshToken.delete({ where: { token: oldToken } });
    const newToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);
    await this.prisma.refreshToken.create({
      data: { token: newToken, userId: rec.userId, expiresAt },
    });
    const email = rec.user.emailEncrypted
      ? decryptEmail(rec.user.emailEncrypted)
      : (rec.user.email ?? null);
    return {
      newToken,
      userId: rec.userId,
      email,
      role: rec.user.role,
    };
  }

  async revokeRefreshToken(token: string) {
    try {
      await this.prisma.refreshToken.delete({ where: { token } });
    } catch (e) {
      // ignore
    }
  }

  async findRefreshToken(token: string) {
    const rec = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (rec && rec.expiresAt <= new Date()) return null;
    return rec;
  }
}

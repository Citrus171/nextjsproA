import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/user.service";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(pass, user.password);
    if (match) return { id: user.id, email: user.email };
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
    const rec = await this.prisma.refreshToken.findUnique({
      where: { token: oldToken },
    });
    if (!rec) return null;
    await this.prisma.refreshToken.delete({ where: { token: oldToken } });
    const newToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);
    await this.prisma.refreshToken.create({
      data: { token: newToken, userId: rec.userId, expiresAt },
    });
    return { newToken, userId: rec.userId };
  }

  async revokeRefreshToken(token: string) {
    try {
      await this.prisma.refreshToken.delete({ where: { token } });
    } catch (e) {
      // ignore
    }
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }
}

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma.service";
import { CryptoService } from "./crypto.service";

export interface CookieSpec {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  };
}

export interface AuthResult {
  accessToken: string;
  setCookies: CookieSpec[];
}

export interface UserDto {
  id: string;
  email: string;
  nickname: string;
  role: string;
  createdAt: Date;
}

export abstract class IIdentityService {
  abstract login(email: string, password: string): Promise<AuthResult>;
  abstract refresh(cookieToken: string): Promise<AuthResult>;
  abstract logout(cookieToken: string): Promise<void>;
  abstract register(
    email: string,
    password: string,
    nickname: string
  ): Promise<UserDto>;
  abstract findAll(): Promise<UserDto[]>;
  abstract deleteUser(id: string): Promise<UserDto>;
}

@Injectable()
export class IdentityService extends IIdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService
  ) {
    super();
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalized = this.crypto.normalizeEmail(email);
    const hmac = this.crypto.hmacEmail(normalized);
    const user = await this.findUserByHash(hmac, normalized);
    if (!user) {
      throw new UnauthorizedException("認証情報が正しくありません");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException("認証情報が正しくありません");
    }
    const refreshToken = this.crypto.generateSecureToken();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
      },
    });
    const payload = {
      sub: user.id,
      email: this.decryptSafely(user.emailEncrypted),
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      setCookies: [this.buildRefreshCookie(refreshToken)],
    };
  }

  async refresh(cookieToken: string): Promise<AuthResult> {
    const rec = await this.prisma.refreshToken.findUnique({
      where: { token: cookieToken },
      include: { user: { select: { emailEncrypted: true, role: true } } },
    });
    if (!rec || rec.expiresAt <= new Date()) {
      throw new UnauthorizedException("無効なリフレッシュトークンです");
    }
    try {
      await this.prisma.refreshToken.delete({
        where: { token: cookieToken },
      });
    } catch {
      throw new UnauthorizedException("無効なリフレッシュトークンです");
    }
    const newToken = this.crypto.generateSecureToken();
    await this.prisma.refreshToken.create({
      data: {
        token: newToken,
        userId: rec.userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
      },
    });
    const payload = {
      sub: rec.userId,
      email: this.decryptSafely(rec.user.emailEncrypted),
      role: rec.user.role,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      setCookies: [this.buildRefreshCookie(newToken)],
    };
  }

  async logout(cookieToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.delete({
        where: { token: cookieToken },
      });
    } catch {
      // ignore
    }
  }

  async register(
    email: string,
    password: string,
    nickname: string
  ): Promise<UserDto> {
    const normalized = this.crypto.normalizeEmail(email);
    const hashed = await bcrypt.hash(password, 10);
    const emailHash = this.crypto.hmacEmail(normalized);
    const emailEncrypted = this.crypto.encryptEmail(normalized);

    try {
      const user = await this.prisma.user.create({
        data: {
          emailEncrypted,
          emailHash,
          password: hashed,
          nickname,
        },
      });
      return {
        id: user.id,
        email: normalized,
        nickname: user.nickname,
        role: user.role,
        createdAt: user.createdAt,
      };
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { target?: unknown[] } };
      if (err?.code === "P2002") {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.map(String).join(" ").toLowerCase()
          : "";
        if (target.includes("nickname")) {
          throw new ConflictException(
            "このニックネームはすでに使用されています"
          );
        }
        throw new ConflictException(
          "このメールアドレスはすでに使用されています"
        );
      }
      throw e;
    }
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
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
      email: this.decryptSafely(u.emailEncrypted),
      nickname: u.nickname,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async deleteUser(id: string): Promise<UserDto> {
    const user = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        emailEncrypted: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    });
    return {
      id: user.id,
      email: this.decryptSafely(user.emailEncrypted),
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private async findUserByHash(
    hmac: string,
    normalized: string
  ): Promise<{
    id: string;
    password: string;
    emailEncrypted: string;
    role: string;
  } | null> {
    let user = await this.prisma.user.findUnique({
      where: { emailHash: hmac },
      select: { id: true, password: true, emailEncrypted: true, role: true },
    });
    if (!user) {
      const sha = this.crypto.sha256Hex(normalized);
      user = await this.prisma.user.findUnique({
        where: { emailHash: sha },
        select: { id: true, password: true, emailEncrypted: true, role: true },
      });
    }
    return user;
  }

  private decryptSafely(encrypted: string | null): string | null {
    if (!encrypted) return null;
    const dec = this.crypto.decryptEmail(encrypted);
    return dec;
  }

  private buildRefreshCookie(token: string): CookieSpec {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    return {
      name: "refreshToken",
      value: token,
      options: {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    };
  }
}

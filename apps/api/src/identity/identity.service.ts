import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { isPrismaKnownError } from "../shared/prisma-error";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { Logger } from "nestjs-pino";
import { PrismaService } from "../prisma.service";
import { CryptoService } from "./crypto.service";
import { ERROR_CODES } from "../common/error-codes";

export const REFRESH_TOKEN_MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000;

export function refreshTokenCookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "lax" | "none",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

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
    private readonly crypto: CryptoService,
    private readonly logger: Logger
  ) {
    super();
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalized = this.crypto.normalizeEmail(email);
    const hmac = this.crypto.hmacEmail(normalized);
    const user = await this.findUserByHash(hmac);
    if (!user) {
      this.logger.warn("auth.login.failure", {
        event: "auth.login.failure",
        reason: "email not found",
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: "認証情報が正しくありません",
      });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      this.logger.warn("auth.login.failure", {
        event: "auth.login.failure",
        reason: "password mismatch",
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: "認証情報が正しくありません",
      });
    }
    const refreshToken = this.crypto.generateSecureToken();
    const tokenHash = this.crypto.sha256Hex(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      },
    });
    const payload = {
      sub: user.id,
      email: this.decryptSafely(user.emailEncrypted),
      role: user.role,
      nickname: user.nickname,
    };
    const accessToken = this.jwt.sign(payload);
    this.logger.log("auth.login.success", {
      event: "auth.login.success",
      userId: user.id,
    });
    return {
      accessToken,
      setCookies: [this.buildRefreshCookie(refreshToken)],
    };
  }

  async refresh(cookieToken: string): Promise<AuthResult> {
    const tokenHash = this.crypto.sha256Hex(cookieToken);
    const rec = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { emailEncrypted: true, role: true, nickname: true } },
      },
    });
    if (!rec || rec.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN,
        message: "無効なリフレッシュトークンです",
      });
    }
    try {
      await this.prisma.refreshToken.delete({
        where: { tokenHash },
      });
    } catch {
      this.logger.warn("auth.refresh.reuse", {
        event: "auth.refresh.reuse",
        userId: rec.userId,
        reason: "token already used",
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN,
        message: "無効なリフレッシュトークンです",
      });
    }
    const newToken = this.crypto.generateSecureToken();
    const newHash = this.crypto.sha256Hex(newToken);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: rec.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      },
    });
    const payload = {
      sub: rec.userId,
      email: this.decryptSafely(rec.user.emailEncrypted),
      role: rec.user.role,
      nickname: rec.user.nickname,
    };
    const accessToken = this.jwt.sign(payload);
    this.logger.log("auth.refresh.success", {
      event: "auth.refresh.success",
      userId: rec.userId,
    });
    return {
      accessToken,
      setCookies: [this.buildRefreshCookie(newToken)],
    };
  }

  async logout(cookieToken: string): Promise<void> {
    const tokenHash = this.crypto.sha256Hex(cookieToken);
    const rec = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    if (rec) {
      this.logger.log("auth.logout", {
        event: "auth.logout",
        userId: rec.userId,
      });
    }
    try {
      await this.prisma.refreshToken.delete({
        where: { tokenHash },
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
      this.logger.log("auth.register.success", {
        event: "auth.register.success",
        userId: user.id,
        email: normalized,
      });
      return {
        id: user.id,
        email: normalized,
        nickname: user.nickname,
        role: user.role,
        createdAt: user.createdAt,
      };
    } catch (e: unknown) {
      if (isPrismaKnownError(e) && e.code === "P2002") {
        const rawTarget = e.meta?.target;
        const target = Array.isArray(rawTarget)
          ? rawTarget.map(String).join(" ").toLowerCase()
          : "";
        if (target.includes("nickname")) {
          throw new ConflictException({
            code: ERROR_CODES.AUTH_DUPLICATE_NICKNAME,
            message: "このニックネームはすでに使用されています",
          });
        }
        throw new ConflictException({
          code: ERROR_CODES.AUTH_DUPLICATE_EMAIL,
          message: "このメールアドレスはすでに使用されています",
        });
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
      email: this.decryptSafely(u.emailEncrypted) ?? "",
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
      email: this.decryptSafely(user.emailEncrypted) ?? "",
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private async findUserByHash(hmac: string): Promise<{
    id: string;
    password: string;
    emailEncrypted: string;
    role: string;
    nickname: string;
  } | null> {
    return this.prisma.user.findUnique({
      where: { emailHash: hmac },
      select: {
        id: true,
        password: true,
        emailEncrypted: true,
        role: true,
        nickname: true,
      },
    });
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
      options: refreshTokenCookieOptions(isProd),
    };
  }
}

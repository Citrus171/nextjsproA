import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string, name?: string) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashed, nickname: name ?? "" },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // TanStack Start との対比用: DB から全ユーザーを取得（パスワード除外）
  // TanStack Start: export const getUsers = createServerFn(async () => db.user.findMany())
  // NestJS:  この1行が「サーバー関数の中身」に相当する
  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, nickname: true, createdAt: true },
    });
  }
}

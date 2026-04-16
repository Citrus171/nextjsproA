import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string, name?: string) {
    console.log('Creating user:', email, name);
    try {
      const hashed = await bcrypt.hash(password, 10);
      console.log('Hashed password');
      const result = await this.prisma.user.create({ data: { email, password: hashed, name } });
      console.log('User created:', result.id);
      return result;
    } catch (e) {
      console.error('Error in createUser:', e);
      throw e;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

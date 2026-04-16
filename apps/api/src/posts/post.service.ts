import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, title: string, content: string) {
    return this.prisma.post.create({ data: { title, content, authorId } });
  }

  async findAll(page = 1, perPage = 10) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.post.count(),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async update(id: string, data: { title?: string; content?: string }) {
    return this.prisma.post.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }
}

import { Injectable, HttpException, HttpStatus, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private saveFile(file: Express.Multer.File): string {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);
    return `uploads/${fileName}`;
  }

  async create(authorId: string, title: string, content: string, file?: Express.Multer.File) {
    const imagePath = file ? this.saveFile(file) : undefined;
    return this.prisma.post.create({ data: { title, content, authorId, image: imagePath } });
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

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: string },
    file?: Express.Multer.File,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException("You are not the owner of this post");
    }
    const imagePath = file ? this.saveFile(file) : undefined;
    return this.prisma.post.update({
      where: { id },
      data: { ...data, ...(imagePath ? { image: imagePath } : {}) },
    });
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException("You are not the owner of this post");
    }
    return this.prisma.post.delete({ where: { id } });
  }
}

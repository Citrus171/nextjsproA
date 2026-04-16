import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, title: string, content: string, file?: Express.Multer.File) {
    let imagePath: string | undefined;
    if (file) {
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      imagePath = `uploads/${fileName}`;
    }
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

  async update(id: string, data: { title?: string; content?: string }) {
    fs.appendFileSync('debug.log', `Update called with id: ${id}, data: ${JSON.stringify(data)}\n`);
    try {
      const post = await this.prisma.post.findUnique({ where: { id } });
      fs.appendFileSync('debug.log', `Post found: ${!!post}\n`);
      if (!post) {
        throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
      }
      const result = await this.prisma.post.update({ where: { id }, data });
      fs.appendFileSync('debug.log', `Update result: ${JSON.stringify(result)}\n`);
      return result;
    } catch (error) {
      fs.appendFileSync('debug.log', `Update error: ${error}\n`);
      throw error;
    }
  }

  async remove(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
    }
    return this.prisma.post.delete({ where: { id } });
  }
}

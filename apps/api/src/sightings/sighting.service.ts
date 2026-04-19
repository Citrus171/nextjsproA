import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateSightingDto } from "./dto/create-sighting.dto";

@Injectable()
export class SightingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSightingDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId === userId)
      throw new ForbiddenException("投稿者本人はSightingを作成できません");

    return this.prisma.sighting.create({
      data: {
        postId: dto.postId,
        userId,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        sightedAt: new Date(dto.sightedAt),
        comment: dto.comment,
      },
    });
  }

  async findByPost(postId: string) {
    return this.prisma.sighting.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });
  }

  async remove(userId: string, id: string) {
    const sighting = await this.prisma.sighting.findUnique({ where: { id } });
    if (!sighting) throw new NotFoundException("Sighting not found");
    if (sighting.userId !== userId)
      throw new ForbiddenException("削除できるのは本人のみです");

    await this.prisma.sighting.delete({ where: { id } });
  }
}

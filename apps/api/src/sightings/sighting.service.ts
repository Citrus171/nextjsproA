import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateSightingDto } from "./dto/create-sighting.dto";

const MAX_FAVORITES_LIMIT = 20;

@Injectable()
export class SightingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSightingDto) {
    // eslint-disable-next-line eqeqeq
    if (dto.postId != null) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
      });
      if (!post) throw new NotFoundException("投稿が見つかりません");
      if (post.userId === userId)
        throw new ForbiddenException("投稿者本人はSightingを作成できません");
    }

    return this.prisma.sighting.create({
      data: {
        postId: dto.postId ?? null,
        userId,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        sightedAt: new Date(dto.sightedAt),
        comment: dto.comment,
      },
    });
  }

  async findOne(id: string) {
    const sighting = await this.prisma.sighting.findUnique({
      where: { id },
      include: { user: { select: { nickname: true } } },
    });
    if (!sighting) throw new NotFoundException("目撃情報が見つかりません");
    const { user, ...rest } = sighting;
    return { ...rest, nickname: user.nickname };
  }

  async findByPost(postId: string) {
    return this.prisma.sighting.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });
  }

  async toggleFavorite(userId: string, sightingId: string) {
    const sighting = await this.prisma.sighting.findUnique({
      where: { id: sightingId },
    });
    if (!sighting) throw new NotFoundException("目撃情報が見つかりません");
    if (sighting.userId === userId)
      throw new ForbiddenException("自分の目撃情報はお気に入りできません");

    const existing = await this.prisma.sightingFavorite.findUnique({
      where: { userId_sightingId: { userId, sightingId } },
    });

    if (existing) {
      await this.prisma.sightingFavorite.delete({
        where: { userId_sightingId: { userId, sightingId } },
      });
      return { favorited: false };
    }

    await this.prisma.$transaction(async (tx) => {
      const count = await tx.sightingFavorite.count({ where: { userId } });
      if (count >= MAX_FAVORITES_LIMIT)
        throw new BadRequestException("お気に入りは20件までです");
      await tx.sightingFavorite.create({ data: { userId, sightingId } });
    });
    return { favorited: true };
  }

  async remove(userId: string, id: string, isAdmin = false) {
    const sighting = await this.prisma.sighting.findUnique({ where: { id } });
    if (!sighting) throw new NotFoundException("目撃情報が見つかりません");
    if (sighting.userId !== userId && !isAdmin)
      throw new ForbiddenException("削除できるのは本人のみです");

    await this.prisma.sighting.delete({ where: { id } });
  }
}

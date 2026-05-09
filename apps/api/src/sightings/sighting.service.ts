import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateSightingDto } from "./dto/create-sighting.dto";
import { MAX_FAVORITES_LIMIT } from "../common/constants";
import { ERROR_CODES } from "../common/error-codes";

@Injectable()
export class SightingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSightingDto) {
    // eslint-disable-next-line eqeqeq
    if (dto.postId != null) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
      });
      if (!post)
        throw new NotFoundException({
          code: ERROR_CODES.POST_NOT_FOUND,
          message: "投稿が見つかりません",
        });
      if (post.userId === userId)
        throw new ForbiddenException({
          code: ERROR_CODES.SIGHTING_SELF_CREATE,
          message: "投稿者本人はSightingを作成できません",
        });
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
    if (!sighting)
      throw new NotFoundException({
        code: ERROR_CODES.SIGHTING_NOT_FOUND,
        message: "目撃情報が見つかりません",
      });
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
    if (!sighting)
      throw new NotFoundException({
        code: ERROR_CODES.SIGHTING_NOT_FOUND,
        message: "目撃情報が見つかりません",
      });
    if (sighting.userId === userId)
      throw new ForbiddenException({
        code: ERROR_CODES.SIGHTING_SELF_FAVORITE,
        message: "自分の目撃情報はお気に入りできません",
      });

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
        throw new BadRequestException({
          code: ERROR_CODES.SIGHTING_FAVORITE_LIMIT,
          message: "お気に入りは20件までです",
        });
      await tx.sightingFavorite.create({ data: { userId, sightingId } });
    });
    return { favorited: true };
  }

  async remove(userId: string, id: string, isAdmin = false) {
    const sighting = await this.prisma.sighting.findUnique({ where: { id } });
    if (!sighting)
      throw new NotFoundException({
        code: ERROR_CODES.SIGHTING_NOT_FOUND,
        message: "目撃情報が見つかりません",
      });
    if (sighting.userId !== userId && !isAdmin)
      throw new ForbiddenException({
        code: ERROR_CODES.SIGHTING_NOT_OWNER,
        message: "削除できるのは本人のみです",
      });

    await this.prisma.sighting.delete({ where: { id } });
  }
}

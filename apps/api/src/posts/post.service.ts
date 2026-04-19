import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import type { PostStatus, Gender, Prefecture } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const MAX_IMAGES = 5;

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private saveFile(postId: string, file: Express.Multer.File): string {
    const uploadDir = path.join(__dirname, "../../uploads", postId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const fileName = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);
    return `uploads/${postId}/${fileName}`;
  }

  private deleteFile(url: string): void {
    const filePath = path.join(__dirname, "../../", url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async create(
    userId: string,
    dto: CreatePostDto,
    files: Express.Multer.File[] = []
  ) {
    if (files.length > MAX_IMAGES) {
      throw new BadRequestException(`最大${MAX_IMAGES}枚まで添付できます`);
    }

    const lostDate = dto.lostDate ? new Date(dto.lostDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          title: dto.title,
          description: dto.description,
          userId,
          lostDate,
        },
      });

      if (dto.petDetail) {
        const pd = dto.petDetail;
        await tx.petDetail.create({
          data: {
            postId: post.id,
            name: pd.name,
            color: pd.color,
            age: pd.age,
            features: pd.features,
            ...(pd.gender !== undefined && { gender: pd.gender as Gender }),
            ...(pd.breed !== undefined && { breed: pd.breed }),
            ...(pd.size !== undefined && { size: pd.size }),
            ...(pd.collar !== undefined && { collar: pd.collar }),
            ...(pd.microchip !== undefined && { microchip: pd.microchip }),
            ...(pd.neutered !== undefined && { neutered: pd.neutered }),
          },
        });
      }

      if (dto.location) {
        const loc = dto.location;
        await tx.location.create({
          data: {
            postId: post.id,
            prefecture: loc.prefecture as Prefecture,
            city: loc.city,
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
          },
        });
      }

      for (const file of files) {
        const url = this.saveFile(post.id, file);
        await tx.image.create({ data: { postId: post.id, url } });
      }

      return tx.post.findUnique({
        where: { id: post.id },
        include: { petDetail: true, location: true, images: true },
      });
    });
  }

  async findAll(page = 1, perPage = 10) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        include: { petDetail: true, location: true, images: true },
      }),
      this.prisma.post.count(),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.post.findUnique({
      where: { id },
      include: { petDetail: true, location: true, images: true },
    });
  }

  async addImages(
    postId: string,
    userId: string,
    files: Express.Multer.File[]
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { images: true },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId !== userId)
      throw new ForbiddenException("You are not the owner of this post");

    const currentCount = post.images.length;
    if (currentCount + files.length > MAX_IMAGES) {
      throw new BadRequestException(
        `画像は最大${MAX_IMAGES}枚です（現在${currentCount}枚、追加可能: ${MAX_IMAGES - currentCount}枚）`
      );
    }

    const newImages = await Promise.all(
      files.map(async (file) => {
        const url = this.saveFile(postId, file);
        return this.prisma.image.create({ data: { postId, url } });
      })
    );

    return {
      remainingSlots: MAX_IMAGES - currentCount - files.length,
      images: newImages,
    };
  }

  async removeImage(postId: string, imageId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.userId !== userId)
      throw new ForbiddenException("You are not the owner of this post");

    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
    });
    if (!image || image.postId !== postId)
      throw new NotFoundException("Image not found");

    this.deleteFile(image.url);
    return this.prisma.image.delete({ where: { id: imageId } });
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException("You are not the owner of this post");
    }

    return this.prisma.$transaction(async (tx) => {
      const { petDetail, location, lostDate, status, title, description } = dto;

      const updated = await tx.post.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(lostDate !== undefined && { lostDate: new Date(lostDate) }),
          ...(status !== undefined && { status: status as PostStatus }),
        },
      });

      if (petDetail !== undefined) {
        const pd = petDetail;
        await tx.petDetail.upsert({
          where: { postId: id },
          create: {
            postId: id,
            name: pd.name ?? "",
            color: pd.color ?? "",
            age: pd.age ?? "",
            features: pd.features ?? "",
            ...(pd.gender !== undefined && { gender: pd.gender as Gender }),
            ...(pd.breed !== undefined && { breed: pd.breed }),
            ...(pd.size !== undefined && { size: pd.size }),
            ...(pd.collar !== undefined && { collar: pd.collar }),
            ...(pd.microchip !== undefined && { microchip: pd.microchip }),
            ...(pd.neutered !== undefined && { neutered: pd.neutered }),
          },
          update: {
            ...(pd.name !== undefined && { name: pd.name }),
            ...(pd.color !== undefined && { color: pd.color }),
            ...(pd.age !== undefined && { age: pd.age }),
            ...(pd.features !== undefined && { features: pd.features }),
            ...(pd.gender !== undefined && { gender: pd.gender as Gender }),
            ...(pd.breed !== undefined && { breed: pd.breed }),
            ...(pd.size !== undefined && { size: pd.size }),
            ...(pd.collar !== undefined && { collar: pd.collar }),
            ...(pd.microchip !== undefined && { microchip: pd.microchip }),
            ...(pd.neutered !== undefined && { neutered: pd.neutered }),
          },
        });
      }

      if (location !== undefined) {
        const loc = location;
        await tx.location.upsert({
          where: { postId: id },
          create: {
            postId: id,
            prefecture: (loc.prefecture ?? "saitama") as Prefecture,
            city: loc.city ?? "",
            address: loc.address ?? "",
            lat: loc.lat ?? 0,
            lng: loc.lng ?? 0,
          },
          update: {
            ...(loc.prefecture !== undefined && {
              prefecture: loc.prefecture as Prefecture,
            }),
            ...(loc.city !== undefined && { city: loc.city }),
            ...(loc.address !== undefined && { address: loc.address }),
            ...(loc.lat !== undefined && { lat: loc.lat }),
            ...(loc.lng !== undefined && { lng: loc.lng }),
          },
        });
      }

      return updated;
    });
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!post) {
      throw new HttpException("Post not found", HttpStatus.NOT_FOUND);
    }
    if (post.userId !== userId) {
      throw new ForbiddenException("You are not the owner of this post");
    }

    for (const image of post.images) {
      this.deleteFile(image.url);
    }

    return this.prisma.post.delete({ where: { id } });
  }
}

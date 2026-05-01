import {
  Injectable,
  HttpException,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  PostType,
  type PostStatus,
  Prisma,
  type Gender,
  type Prefecture,
} from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as sharp from "sharp";
import {
  CreatePostDto,
  CreatePetDetailDto,
  CreateLocationDto,
} from "./dto/create-post.dto";
import {
  UpdatePostDto,
  UpdatePetDetailDto,
  UpdateLocationDto,
} from "./dto/update-post.dto";
import {
  getImageUploadLimit,
  getMonthlyPostLimit,
} from "../common/plan-limits";

const MAX_FAVORITES_LIMIT = 20;
const MAX_TRANSACTION_RETRIES = 3;

function getMonthRange(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

function isTransactionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2034"
  );
}

function applyStatusUpdate(data: Prisma.PostUpdateInput, status: string) {
  data.status = status as PostStatus;
  if (status === "resolved") data.resolvedAt = new Date();
  else if (status === "lost") data.resolvedAt = null;
}

function buildPostUpdateData(dto: UpdatePostDto): Prisma.PostUpdateInput {
  const data: Prisma.PostUpdateInput = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.lostDate !== undefined) data.lostDate = new Date(dto.lostDate);
  if (dto.postType !== undefined) data.postType = dto.postType as PostType;
  if (dto.status !== undefined) applyStatusUpdate(data, dto.status);
  return data;
}

function buildPetDetailUpsertData(postId: string, pd: UpdatePetDetailDto) {
  const create: Prisma.PetDetailUncheckedCreateInput = {
    postId,
    name: pd.name!,
    color: pd.color!,
    age: pd.age!,
    features: pd.features!,
  };
  const update: Prisma.PetDetailUncheckedUpdateInput = {};

  const optionalFields: Array<{
    key: "gender" | "breed" | "size" | "collar" | "microchip" | "neutered";
    transform?: (v: unknown) => unknown;
  }> = [
    { key: "gender", transform: (v) => v as Gender },
    { key: "breed" },
    { key: "size" },
    { key: "collar" },
    { key: "microchip" },
    { key: "neutered" },
  ];

  for (const { key, transform } of optionalFields) {
    const val = pd[key];
    if (val !== undefined) {
      const v = transform ? transform(val) : val;
      (create as Record<string, unknown>)[key] = v;
      (update as Record<string, unknown>)[key] = v;
    }
  }

  for (const key of ["name", "color", "age", "features"] as const) {
    if (pd[key] !== undefined)
      (update as Record<string, unknown>)[key] = pd[key];
  }

  return { create, update };
}

function buildLocationUpsertData(postId: string, loc: UpdateLocationDto) {
  const create: Prisma.LocationUncheckedCreateInput = {
    postId,
    prefecture: loc.prefecture! as Prefecture,
    city: loc.city!,
    address: loc.address!,
    lat: loc.lat!,
    lng: loc.lng!,
  };
  const update: Prisma.LocationUncheckedUpdateInput = {};
  const fields: Array<{
    key: keyof UpdateLocationDto;
    transform?: (v: unknown) => unknown;
  }> = [
    { key: "prefecture", transform: (v) => v as Prefecture },
    { key: "city" },
    { key: "address" },
    { key: "lat" },
    { key: "lng" },
  ];
  for (const { key, transform } of fields) {
    const val = loc[key];
    if (val !== undefined) {
      (update as Record<string, unknown>)[key] = transform
        ? transform(val)
        : val;
    }
  }
  return { create, update };
}

function validateNewPetDetail(existing: unknown, pd: UpdatePetDetailDto) {
  if (!existing && (!pd.name || !pd.color || !pd.age || !pd.features)) {
    throw new BadRequestException(
      "petDetailを新規作成する場合、name/color/age/featuresは必須です"
    );
  }
}

function validateNewLocation(existing: unknown, loc: UpdateLocationDto) {
  if (
    !existing &&
    (!loc.prefecture ||
      !loc.city ||
      !loc.address ||
      loc.lat === undefined ||
      loc.lng === undefined)
  ) {
    throw new BadRequestException(
      "locationを新規作成する場合、prefecture/city/address/lat/lngは必須です"
    );
  }
}

async function checkPlanLimits(
  tx: Prisma.TransactionClient,
  userId: string,
  fileCount: number
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    throw new NotFoundException("ユーザーが見つかりません");
  }

  const imageUploadLimit = getImageUploadLimit(user.plan);
  if (fileCount > imageUploadLimit) {
    throw new ForbiddenException(
      `このプランでは画像は最大${imageUploadLimit}枚までです`
    );
  }

  const monthlyPostLimit = getMonthlyPostLimit(user.plan);
  if (monthlyPostLimit !== null) {
    const { start, end } = getMonthRange();
    const postCount = await tx.post.count({
      where: {
        userId,
        createdAt: { gte: start, lt: end },
      },
    });

    if (postCount >= monthlyPostLimit) {
      throw new ForbiddenException("無料プランの月間投稿数上限に達しています");
    }
  }
}

function buildPetDetailCreateData(
  postId: string,
  pd: CreatePetDetailDto
): Prisma.PetDetailUncheckedCreateInput {
  const data: Prisma.PetDetailUncheckedCreateInput = {
    postId,
    name: pd.name,
    color: pd.color,
    age: pd.age,
    features: pd.features,
  };

  if (pd.gender !== undefined)
    (data as Record<string, unknown>).gender = pd.gender as Gender;
  if (pd.breed !== undefined)
    (data as Record<string, unknown>).breed = pd.breed;
  if (pd.size !== undefined) (data as Record<string, unknown>).size = pd.size;
  if (pd.collar !== undefined)
    (data as Record<string, unknown>).collar = pd.collar;
  if (pd.microchip !== undefined)
    (data as Record<string, unknown>).microchip = pd.microchip;
  if (pd.neutered !== undefined)
    (data as Record<string, unknown>).neutered = pd.neutered;

  return data;
}

function buildLocationCreateData(
  postId: string,
  loc: CreateLocationDto
): Prisma.LocationUncheckedCreateInput {
  return {
    postId,
    prefecture: loc.prefecture as Prefecture,
    city: loc.city,
    address: loc.address,
    lat: loc.lat,
    lng: loc.lng,
  };
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private async saveFile(
    postId: string,
    file: Express.Multer.File
  ): Promise<string> {
    const uploadDir = path.join(__dirname, "../../uploads", postId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      throw new BadRequestException(
        "画像処理に失敗しました。ファイルが破損または無効な形式です。"
      );
    }

    const fileName = `${uuidv4()}.jpg`;
    // 書き込みエラー（例: disk full）はここでそのまま例外として伝播させる
    fs.writeFileSync(path.join(uploadDir, fileName), processedBuffer);
    return `uploads/${postId}/${fileName}`;
  }

  private prefixImageUrl(url: string): string {
    return `/${url}`;
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
    if (!dto.lostDate) {
      throw new BadRequestException("lostDateは必須です");
    }
    const lostDate = new Date(dto.lostDate);

    let createdPost!: { id: string };
    for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
      try {
        createdPost = await this.prisma.$transaction(
          async (tx) => {
            await checkPlanLimits(tx, userId, files.length);

            const post = await tx.post.create({
              data: {
                title: dto.title,
                description: dto.description,
                userId,
                postType: dto.postType ?? PostType.cat,
                lostDate,
              },
            });

            if (dto.petDetail) {
              await tx.petDetail.create({
                data: buildPetDetailCreateData(post.id, dto.petDetail),
              });
            }

            if (dto.location) {
              await tx.location.create({
                data: buildLocationCreateData(post.id, dto.location),
              });
            }

            return { id: post.id };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );
        break;
      } catch (e) {
        if (isTransactionConflict(e) && attempt < MAX_TRANSACTION_RETRIES - 1) {
          continue;
        }
        throw e;
      }
    }

    return this.saveFilesAndBuildResponse(createdPost.id, files);
  }

  private async saveFilesAndBuildResponse(
    postId: string,
    files: Express.Multer.File[]
  ) {
    const savedUrls: string[] = [];
    try {
      for (const file of files) {
        const url = await this.saveFile(postId, file);
        savedUrls.push(url);
      }

      await this.prisma.$transaction(async (tx) => {
        return Promise.all(
          savedUrls.map((url) => tx.image.create({ data: { postId, url } }))
        );
      });

      const fullPost = await this.prisma.post.findUnique({
        where: { id: postId },
        include: { petDetail: true, location: true, images: true },
      });

      return {
        ...fullPost!,
        images: (fullPost!.images ?? []).map((img) => ({
          ...img,
          url: this.prefixImageUrl(img.url),
        })),
      };
    } catch (e) {
      for (const url of savedUrls) {
        try {
          this.deleteFile(url);
        } catch {}
      }
      try {
        await this.prisma.post.delete({ where: { id: postId } });
      } catch {}
      throw e;
    }
  }

  async findAll(page = 1, perPage = 10) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        include: {
          petDetail: true,
          location: true,
          images: true,
          user: { select: { nickname: true } },
        },
      }),
      this.prisma.post.count(),
    ]);

    return {
      items: items.map(({ user, ...rest }) => ({
        ...rest,
        authorNickname: user?.nickname ?? null,
        images: (rest.images ?? []).map((img) => ({
          ...img,
          url: this.prefixImageUrl(img.url),
        })),
      })),
      total,
    };
  }

  async findById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        petDetail: true,
        location: true,
        images: true,
        user: { select: { nickname: true } },
      },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const { user, ...rest } = post;
    return {
      ...rest,
      authorNickname: user?.nickname ?? null,
      images: (rest.images ?? []).map((img) => ({
        ...img,
        url: this.prefixImageUrl(img.url),
      })),
    };
  }

  async addImages(
    postId: string,
    userId: string,
    files: Express.Multer.File[],
    isAdmin = false
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { images: true },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");
    if (post.userId !== userId && !isAdmin)
      throw new ForbiddenException("投稿のオーナーではありません");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user) throw new NotFoundException("ユーザーが見つかりません");

    const currentCount = post.images.length;
    const imageUploadLimit = getImageUploadLimit(user.plan);
    if (currentCount + files.length > imageUploadLimit) {
      throw new ForbiddenException(
        `画像は最大${imageUploadLimit}枚です（現在${currentCount}枚、追加可能: ${imageUploadLimit - currentCount}枚）`
      );
    }

    return this.saveImagesAndBuildResponse(
      postId,
      files,
      imageUploadLimit,
      currentCount
    );
  }

  private async saveImagesAndBuildResponse(
    postId: string,
    files: Express.Multer.File[],
    imageUploadLimit: number,
    currentCount: number
  ) {
    const savedUrls: string[] = [];
    try {
      for (const file of files) {
        const url = await this.saveFile(postId, file);
        savedUrls.push(url);
      }

      const newImages = await this.prisma.$transaction(async (tx) => {
        return Promise.all(
          savedUrls.map((url) => tx.image.create({ data: { postId, url } }))
        );
      });

      return {
        remainingSlots: imageUploadLimit - currentCount - files.length,
        images: newImages.map((img) => ({
          ...img,
          url: this.prefixImageUrl(img.url),
        })),
      };
    } catch (error) {
      for (const url of savedUrls) {
        try {
          this.deleteFile(url);
        } catch {}
      }
      throw error;
    }
  }

  async removeImage(postId: string, imageId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("投稿が見つかりません");
    if (post.userId !== userId)
      throw new ForbiddenException("投稿のオーナーではありません");

    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
    });
    if (!image || image.postId !== postId)
      throw new NotFoundException("画像が見つかりません");

    this.deleteFile(image.url);
    const deleted = await this.prisma.image.delete({ where: { id: imageId } });
    return { ...deleted, url: this.prefixImageUrl(deleted.url) };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePostDto,
    isAdmin = false
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { petDetail: true, location: true },
    });
    if (!post) {
      throw new HttpException("投稿が見つかりません", HttpStatus.NOT_FOUND);
    }
    if (post.userId !== userId && !isAdmin) {
      throw new ForbiddenException("投稿のオーナーではありません");
    }

    return this.prisma
      .$transaction(async (tx) => {
        await tx.post.update({
          where: { id },
          data: buildPostUpdateData(dto),
        });

        if (dto.petDetail !== undefined) {
          validateNewPetDetail(post.petDetail, dto.petDetail);
          await tx.petDetail.upsert({
            where: { postId: id },
            ...buildPetDetailUpsertData(id, dto.petDetail),
          });
        }

        if (dto.location !== undefined) {
          validateNewLocation(post.location, dto.location);
          await tx.location.upsert({
            where: { postId: id },
            ...buildLocationUpsertData(id, dto.location),
          });
        }

        return tx.post.findUnique({
          where: { id },
          include: { petDetail: true, location: true, images: true },
        });
      })
      .then((result) => ({
        ...result!,
        images: (result!.images ?? []).map((img) => ({
          ...img,
          url: this.prefixImageUrl(img.url),
        })),
      }));
  }

  async toggleFavorite(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("投稿が見つかりません");
    if (post.userId === userId)
      throw new ForbiddenException("自分の投稿はお気に入りできません");

    const existing = await this.prisma.postFavorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.postFavorite.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { favorited: false };
    }

    await this.prisma.$transaction(async (tx) => {
      const count = await tx.postFavorite.count({ where: { userId } });
      if (count >= MAX_FAVORITES_LIMIT)
        throw new BadRequestException("お気に入りは20件までです");
      await tx.postFavorite.create({ data: { userId, postId } });
    });
    return { favorited: true };
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!post) {
      throw new HttpException("投稿が見つかりません", HttpStatus.NOT_FOUND);
    }
    if (post.userId !== userId && !isAdmin) {
      throw new ForbiddenException("投稿のオーナーではありません");
    }

    for (const image of post.images) {
      this.deleteFile(image.url);
    }

    return this.prisma.post.delete({ where: { id } });
  }
}

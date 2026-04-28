import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post as HttpPost,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import {
  PostResponseDto,
  PostListResponseDto,
  AddImagesResponseDto,
  ImageResponseDto,
} from "./dto/post-response.dto";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostsService } from "./post.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { Plan } from "@prisma/client";
import { PLAN_LIMITS } from "../common/plan-limits";
import {
  OPENAPI_IMAGE_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
} from "../common/openapi-examples";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_POST = PLAN_LIMITS[Plan.premium].imageUploadLimit;

export function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file || !file.originalname || !file.mimetype) {
    return cb(null, false);
  }
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(`未対応のファイル形式です: ${file.mimetype}`),
      false
    );
  }
}

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
};

@ApiTags("posts")
@ApiBearerAuth()
@Controller("posts")
export class PostsController {
  constructor(private posts: PostsService) {}

  @HttpPost()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("images", MAX_IMAGES_PER_POST, imageUploadOptions)
  )
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, type: PostResponseDto })
  @ApiResponse({
    status: 403,
    description: "プラン上限超過（無料プランは3枚まで、有料プランは10枚まで）",
  })
  @ApiBody({
    schema: {
      type: "object",
      example: {
        postType: "cat",
        title: "白猫のミケを探しています",
        description: "首輪なし、人懐こい性格",
        lostDate: "2024-01-01",
        petDetail: JSON.stringify({
          name: "ミケ",
          color: "white",
          age: "2 years",
          features: "Pink nose, blue collar",
          gender: "female",
          breed: "Mixed",
          size: "medium",
          collar: "blue collar",
          microchip: true,
          neutered: true,
        }),
        location: JSON.stringify({
          prefecture: "saitama",
          city: "Saitama City",
          address: "Urawa-ku 1-1-1",
          lat: 35.8617,
          lng: 139.6455,
        }),
        images: ["<binary>"],
      },
      properties: {
        postType: { type: "string", enum: ["cat"], default: "cat" },
        title: { type: "string" },
        description: { type: "string" },
        lostDate: { type: "string" },
        petDetail: { type: "string", description: "JSON string" },
        location: { type: "string", description: "JSON string" },
        images: { type: "array", items: { type: "string", format: "binary" } },
      },
    },
  })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.posts.create(req.user.id, dto, files ?? []);
  }

  @Get()
  @ApiResponse({ status: 200, type: PostListResponseDto })
  async list(@Query("page") page = "1", @Query("perPage") perPage = "10") {
    const p = parseInt(page as any, 10) || 1;
    const pp = parseInt(perPage as any, 10) || 10;
    return this.posts.findAll(p, pp);
  }

  @Get(":id")
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: PostResponseDto })
  async get(@Param("id") id: string) {
    return this.posts.findById(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdatePostDto
  ) {
    return this.posts.update(id, req.user.id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({
    status: 403,
    description: "Forbidden: not the post owner or admin",
  })
  async remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.posts.remove(id, req.user.id, req.user.role === "admin");
  }

  @HttpPost(":id/images")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("images", MAX_IMAGES_PER_POST, imageUploadOptions)
  )
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiResponse({ status: 201, type: AddImagesResponseDto })
  @ApiResponse({
    status: 400,
    description: "1リクエストあたりの画像枚数上限超過（最大10枚）",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden: not the post owner or プラン上限超過（無料プランは3枚まで、有料プランは10枚まで）",
  })
  @ApiBody({
    schema: {
      type: "object",
      example: {
        images: ["<binary>"],
      },
      properties: {
        images: { type: "array", items: { type: "string", format: "binary" } },
      },
    },
  })
  async addImages(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.posts.addImages(id, req.user.id, files ?? []);
  }

  @Delete(":id/images/:imageId")
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiParam({ name: "imageId", example: OPENAPI_IMAGE_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: ImageResponseDto })
  @ApiResponse({
    status: 403,
    description: "Forbidden: not the post owner or admin",
  })
  @ApiResponse({ status: 404, description: "Image not found" })
  async removeImage(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("imageId") imageId: string
  ) {
    return this.posts.removeImage(id, imageId, req.user.id);
  }

  @HttpPost(":id/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "id", example: OPENAPI_POST_ID_EXAMPLE })
  @ApiResponse({
    status: 201,
    schema: { properties: { favorited: { type: "boolean" } } },
  })
  @ApiResponse({ status: 400, description: "お気に入り上限超過" })
  @ApiResponse({ status: 403, description: "自分の投稿はお気に入り不可" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async toggleFavorite(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.posts.toggleFavorite(req.user.id, id);
  }
}

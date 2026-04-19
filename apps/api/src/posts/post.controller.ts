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

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file || !file.originalname || !file.mimetype) {
    return cb(null, false);
  }
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(`Unsupported file type: ${file.mimetype}`),
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
  @UseInterceptors(FilesInterceptor("images", 5, imageUploadOptions))
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, type: PostResponseDto })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
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
    @Req() req: any,
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
  @ApiResponse({ status: 200, type: PostResponseDto })
  async get(@Param("id") id: string) {
    return this.posts.findById(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdatePostDto
  ) {
    return this.posts.update(id, req.user.id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.posts.remove(id, req.user.id);
  }

  @HttpPost(":id/images")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("images", 5, imageUploadOptions))
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, type: AddImagesResponseDto })
  @ApiResponse({ status: 400, description: "画像枚数上限超過" })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        images: { type: "array", items: { type: "string", format: "binary" } },
      },
    },
  })
  async addImages(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    return this.posts.addImages(id, req.user.id, files ?? []);
  }

  @Delete(":id/images/:imageId")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, type: ImageResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  @ApiResponse({ status: 404, description: "Image not found" })
  async removeImage(
    @Req() req: any,
    @Param("id") id: string,
    @Param("imageId") imageId: string
  ) {
    return this.posts.removeImage(id, imageId, req.user.id);
  }
}

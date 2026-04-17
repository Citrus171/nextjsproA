import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post as HttpPost,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from "@nestjs/swagger";
import { PostResponseDto, PostListResponseDto } from "./dto/post-response.dto";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostsService } from "./post.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
};

@ApiTags('posts')
@ApiBearerAuth()
@Controller("posts")
export class PostsController {
  constructor(private posts: PostsService) {}

  @HttpPost()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, type: PostResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(@Req() req: any, @Body() dto: CreatePostDto, @UploadedFile() file: Express.Multer.File) {
    const authorId = req.user.id;
    return this.posts.create(authorId, dto.title, dto.content, file);
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

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdatePostDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.posts.update(id, req.user.id, body, file);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.posts.remove(id, req.user.id);
  }
}

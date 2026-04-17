import {
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
import { ApiProperty, ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsOptional } from "class-validator";
import { PostResponseDto, PostListResponseDto } from "./dto/post-response.dto";
import { PostsService } from "./post.service";
import { AuthGuard } from "../auth/auth.guard";

class CreatePostDto {
  @ApiProperty({ example: "My first post" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: "Hello world!" })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;
}

class UpdatePostDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}

@ApiTags('posts')
@ApiBearerAuth()
@Controller("posts")
export class PostsController {
  constructor(private posts: PostsService) {}

  @HttpPost()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
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
    const authorId = req.user?.id || dto["authorId"] || "";
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
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async update(@Req() req: any, @Param("id") id: string, @Body() body: UpdatePostDto) {
    return this.posts.update(id, req.user.id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: PostResponseDto })
  @ApiResponse({ status: 403, description: "Forbidden: not the post owner" })
  async remove(@Req() req: any, @Param("id") id: string) {
    return this.posts.remove(id, req.user.id);
  }
}

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
import { ApiProperty, ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { PostsService } from "./post.service";
import { AuthGuard } from "../auth/auth.guard";

class CreatePostDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  image?: string;
}

class UpdatePostDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
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
  async list(@Query("page") page = "1", @Query("perPage") perPage = "10") {
    const p = parseInt(page as any, 10) || 1;
    const pp = parseInt(perPage as any, 10) || 10;
    return this.posts.findAll(p, pp);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.posts.findById(id);
  }

  @Put(":id")
  @UseGuards(AuthGuard)
  async update(@Param("id") id: string, @Body() body: UpdatePostDto) {
    return this.posts.update(id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string) {
    return this.posts.remove(id);
  }
}

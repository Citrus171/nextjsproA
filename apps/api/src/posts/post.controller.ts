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
} from "@nestjs/common";
import { PostsService } from "./post.service";
import { AuthGuard } from "../auth/auth.guard";

class CreatePostDto {
  title: string;
  content: string;
}

@Controller("posts")
export class PostsController {
  constructor(private posts: PostsService) {}

  @HttpPost()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreatePostDto) {
    const authorId = req.user?.id || dto["authorId"] || "";
    return this.posts.create(authorId, dto.title, dto.content);
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
  async update(@Param("id") id: string, @Body() body: any) {
    return this.posts.update(id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async remove(@Param("id") id: string) {
    return this.posts.remove(id);
  }
}

import { Module } from "@nestjs/common";
import { PostsService } from "./post.service";
import { PostsController } from "./post.controller";
import { PrismaService } from "../prisma.service";
import { AuthGuard } from "../auth/auth.guard";

@Module({
  providers: [PostsService, PrismaService, AuthGuard],
  controllers: [PostsController],
})
export class PostsModule {}

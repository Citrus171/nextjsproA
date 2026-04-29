import { Module } from "@nestjs/common";
import { PostsService } from "./post.service";
import { PostsController } from "./post.controller";
import { PrismaService } from "../prisma.service";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  providers: [PostsService, PrismaService],
  controllers: [PostsController],
})
export class PostsModule {}

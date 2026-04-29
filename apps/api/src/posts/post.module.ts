import { Module } from "@nestjs/common";
import { PostsService } from "./post.service";
import { PostsController } from "./post.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}

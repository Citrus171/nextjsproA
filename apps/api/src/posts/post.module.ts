import { Module } from "@nestjs/common";
import { PostsService } from "./post.service";
import { PostsController } from "./post.controller";
import { IdentityModule } from "../identity/identity.module";
import { FileStorageService } from "./file-storage.service";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [IdentityModule, SharedModule],
  providers: [PostsService, FileStorageService],
  controllers: [PostsController],
})
export class PostsModule {}

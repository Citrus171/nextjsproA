import { Module } from "@nestjs/common";
import { PostsService } from "./post.service";
import { PostsController } from "./post.controller";
import { IdentityModule } from "../identity/identity.module";
import { FileStorageService } from "./file-storage.service";
import { ImageProcessingService } from "./image-processing.service";

@Module({
  imports: [IdentityModule],
  providers: [PostsService, FileStorageService, ImageProcessingService],
  controllers: [PostsController],
})
export class PostsModule {}

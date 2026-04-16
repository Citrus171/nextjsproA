import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { UsersModule } from "./users/user.module";
import { PostsModule } from "./posts/post.module";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./auth/auth.guard";

@Module({
  imports: [UsersModule, PostsModule, AuthModule],
  providers: [PrismaService, AuthGuard],
})
export class AppModule {}

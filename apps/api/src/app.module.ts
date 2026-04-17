import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { UsersModule } from "./users/user.module";
import { PostsModule } from "./posts/post.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    PostsModule,
    AuthModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}

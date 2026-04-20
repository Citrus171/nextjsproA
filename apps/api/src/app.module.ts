import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { UsersModule } from "./users/user.module";
import { PostsModule } from "./posts/post.module";
import { AuthModule } from "./auth/auth.module";
import { MapModule } from "./map/map.module";
import { SightingsModule } from "./sightings/sighting.module";
import { ConversationsModule } from "./conversations/conversation.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    PostsModule,
    AuthModule,
    MapModule,
    SightingsModule,
    ConversationsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}

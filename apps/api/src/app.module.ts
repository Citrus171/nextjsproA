import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { IdentityModule } from "./identity/identity.module";
import { PostsModule } from "./posts/post.module";
import { MapModule } from "./map/map.module";
import { SightingsModule } from "./sightings/sighting.module";
import { ConversationsModule } from "./conversations/conversation.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IdentityModule,
    PostsModule,
    MapModule,
    SightingsModule,
    ConversationsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}

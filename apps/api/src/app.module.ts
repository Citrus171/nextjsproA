import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, minutes, hours } from "@nestjs/throttler";
import { PrismaModule } from "./prisma.module";
import { IdentityModule } from "./identity/identity.module";
import { PostsModule } from "./posts/post.module";
import { MapModule } from "./map/map.module";
import { SightingsModule } from "./sightings/sighting.module";
import { ConversationsModule } from "./conversations/conversation.module";
import { AppThrottlerGuard } from "./auth/throttler.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers:
        process.env.NODE_ENV === "test"
          ? [
              { name: "default", ttl: 1_000, limit: 10_000 },
              { name: "login", ttl: 1_000, limit: 10_000 },
              { name: "register", ttl: 1_000, limit: 10_000 },
              { name: "public", ttl: 1_000, limit: 10_000 },
            ]
          : [
              { name: "default", ttl: 60_000, limit: 60 },
              { name: "login", ttl: minutes(15), limit: 5 },
              { name: "register", ttl: hours(1), limit: 3 },
              { name: "public", ttl: 60_000, limit: 120 },
            ],
    }),
    PrismaModule,
    IdentityModule,
    PostsModule,
    MapModule,
    SightingsModule,
    ConversationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}

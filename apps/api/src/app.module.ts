import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { SentryModule } from "@sentry/nestjs/setup";
import { SentryFilter } from "./sentry/sentry.filter";
import { ThrottlerModule, minutes, hours } from "@nestjs/throttler";
import { PrismaModule } from "./prisma.module";
import { IdentityModule } from "./identity/identity.module";
import { PostsModule } from "./posts/post.module";
import { MapModule } from "./map/map.module";
import { SightingsModule } from "./sightings/sighting.module";
import { ConversationsModule } from "./conversations/conversation.module";
import { HealthModule } from "./health/health.module";
import { LoggerModule } from "./logger/logger.module";
import { AppThrottlerGuard } from "./auth/throttler.guard";
import { LoggerInterceptor } from "./logger/logger.interceptor";
import { PrismaClientExceptionFilter } from "./filters/prisma-client-exception.filter";

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers:
        process.env.NODE_ENV === "test" ||
        process.env.NODE_ENV === "development"
          ? [
              { name: "default", ttl: 1_000, limit: 10_000 },
              { name: "login", ttl: 1_000, limit: 10_000 },
              { name: "register", ttl: 1_000, limit: 10_000 },
              { name: "public", ttl: 1_000, limit: 10_000 },
            ]
          : [
              { name: "default", ttl: 60_000, limit: 300 },
              { name: "login", ttl: minutes(15), limit: 5 },
              { name: "register", ttl: hours(1), limit: 3 },
              { name: "public", ttl: 60_000, limit: 120 },
            ],
    }),
    PrismaModule,
    LoggerModule,
    HealthModule,
    IdentityModule,
    PostsModule,
    MapModule,
    SightingsModule,
    ConversationsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryFilter },
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggerInterceptor },
  ],
})
export class AppModule {}

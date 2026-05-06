import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ConversationsController } from "./conversation.controller";
import { ConversationsService } from "./conversation.service";
import { ConversationsGateway } from "./conversations.gateway";
import { ImageProcessingService } from "./image-processing.service";
import { ConversationFileStorageService } from "./conversation-file-storage.service";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [
    IdentityModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    ImageProcessingService,
    ConversationFileStorageService,
  ],
})
export class ConversationsModule {}

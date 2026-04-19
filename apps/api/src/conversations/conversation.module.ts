import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ConversationsController } from "./conversation.controller";
import { ConversationsService } from "./conversation.service";
import { ConversationsGateway } from "./conversations.gateway";

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway, PrismaService],
})
export class ConversationsModule {}

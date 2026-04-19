import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateConversationDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
    });
    if (!post) throw new NotFoundException("Post not found");

    const sighting = await this.prisma.sighting.findUnique({
      where: { id: dto.sightingId },
    });
    if (!sighting) throw new NotFoundException("Sighting not found");

    if (post.userId !== userId && sighting.userId !== userId) {
      throw new ForbiddenException(
        "会話を開始できるのは投稿者または目撃者のみです"
      );
    }

    try {
      return await this.prisma.conversation.create({
        data: {
          postId: dto.postId,
          sightingId: dto.sightingId,
          ownerId: post.userId,
          sighterId: sighting.userId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new ConflictException("この組み合わせの会話はすでに存在します");
      }
      throw e;
    }
  }

  async findAllForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [{ ownerId: userId }, { sighterId: userId }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createMessage(
    userId: string,
    conversationId: string,
    dto: CreateMessageDto
  ) {
    if (dto.body.length > 1000) {
      throw new BadRequestException(
        "メッセージは1000文字以内で入力してください"
      );
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    if (conversation.ownerId !== userId && conversation.sighterId !== userId) {
      throw new ForbiddenException(
        "この会話にメッセージを送る権限がありません"
      );
    }

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: dto.body,
      },
    });
  }

  async findMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    if (conversation.ownerId !== userId && conversation.sighterId !== userId) {
      throw new ForbiddenException("この会話を閲覧する権限がありません");
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }
}

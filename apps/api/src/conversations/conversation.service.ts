import {
  BadRequestException,
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
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const sighting = await this.prisma.sighting.findUnique({
      where: { id: dto.sightingId },
    });
    if (!sighting) throw new NotFoundException("目撃情報が見つかりません");
    if (sighting.postId == null || sighting.postId !== dto.postId) {
      throw new NotFoundException(
        "指定された投稿に紐づく目撃情報ではありません"
      );
    }

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
        const existing = await this.prisma.conversation.findFirst({
          where: { postId: dto.postId, sightingId: dto.sightingId },
        });
        if (existing) return existing;
      }
      throw e;
    }
  }

  async findAllForUser(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ ownerId: userId }, { sighterId: userId }],
      },
      include: {
        post: { select: { title: true } },
        owner: { select: { nickname: true } },
        sighter: { select: { nickname: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
        _count: {
          select: {
            messages: { where: { senderId: { not: userId }, readAt: null } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      postId: conv.postId,
      sightingId: conv.sightingId,
      ownerId: conv.ownerId,
      sighterId: conv.sighterId,
      createdAt: conv.createdAt,
      postTitle: conv.post.title ?? null,
      partnerNickname:
        conv.ownerId === userId
          ? (conv.sighter?.nickname ?? "Unknown")
          : (conv.owner?.nickname ?? "Unknown"),
      lastMessage: conv.messages[0] ?? null,
      unreadCount: conv._count.messages,
    }));
  }

  async findOneForUser(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { sighterId: userId }],
      },
      include: {
        post: { select: { title: true, status: true } },
        owner: { select: { nickname: true } },
        sighter: { select: { nickname: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
        _count: {
          select: {
            messages: { where: { senderId: { not: userId }, readAt: null } },
          },
        },
      },
    });

    if (!conv) throw new NotFoundException("会話が見つかりません");

    // eslint-disable-next-line no-console
    console.log(
      "[findOneForUser]",
      "userId:",
      userId,
      "ownerId:",
      conv.ownerId,
      "sighterId:",
      conv.sighterId,
      "userId==ownerId:",
      userId === conv.ownerId,
      "userId==sighterId:",
      userId === conv.sighterId
    );

    return {
      id: conv.id,
      postId: conv.postId,
      sightingId: conv.sightingId,
      ownerId: conv.ownerId,
      sighterId: conv.sighterId,
      createdAt: conv.createdAt,
      postTitle: conv.post.title ?? null,
      postStatus: conv.post.status ?? null,
      partnerNickname:
        conv.ownerId === userId
          ? (conv.sighter?.nickname ?? "Unknown")
          : (conv.owner?.nickname ?? "Unknown"),
      lastMessage: conv.messages[0] ?? null,
      unreadCount: conv._count.messages,
    };
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
    if (!conversation) throw new NotFoundException("会話が見つかりません");

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
    if (!conversation) throw new NotFoundException("会話が見つかりません");

    if (conversation.ownerId !== userId && conversation.sighterId !== userId) {
      throw new ForbiddenException("この会話を閲覧する権限がありません");
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: {
          OR: [{ ownerId: userId }, { sighterId: userId }],
        },
      },
    });
    return { count };
  }

  async markAsRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException("会話が見つかりません");

    if (conversation.ownerId !== userId && conversation.sighterId !== userId) {
      throw new ForbiddenException("この会話を閲覧する権限がありません");
    }

    return this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
}

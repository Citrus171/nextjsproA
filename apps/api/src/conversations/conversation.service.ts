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
    const { post, sighting } = await this.validateConversationAccess(
      userId,
      dto.postId,
      dto.sightingId
    );

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

  private async validateConversationAccess(
    userId: string,
    postId: string,
    sightingId: string
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException("投稿が見つかりません");

    const sighting = await this.prisma.sighting.findUnique({
      where: { id: sightingId },
    });
    if (!sighting) throw new NotFoundException("目撃情報が見つかりません");
    if (sighting.postId == null || sighting.postId !== postId) {
      throw new NotFoundException(
        "指定された投稿に紐づく目撃情報ではありません"
      );
    }

    if (post.userId !== userId && sighting.userId !== userId) {
      throw new ForbiddenException(
        "会話を開始できるのは投稿者または目撃者のみです"
      );
    }

    return { post, sighting };
  }

  private getPartnerNickname(
    conv: {
      ownerId: string;
      owner: { nickname: string | null } | null;
      sighter: { nickname: string | null } | null;
    },
    userId: string
  ): string {
    return conv.ownerId === userId
      ? (conv.sighter?.nickname ?? "Unknown")
      : (conv.owner?.nickname ?? "Unknown");
  }

  private buildConversationItem(
    conv: {
      id: string;
      postId: string;
      sightingId: string;
      ownerId: string;
      sighterId: string;
      createdAt: Date;
      post: { title: string | null };
      owner: { nickname: string | null } | null;
      sighter: { nickname: string | null } | null;
      messages: { body: string; createdAt: Date }[];
      _count: { messages: number };
    },
    userId: string
  ) {
    return {
      id: conv.id,
      postId: conv.postId,
      sightingId: conv.sightingId,
      ownerId: conv.ownerId,
      sighterId: conv.sighterId,
      createdAt: conv.createdAt,
      postTitle: conv.post.title ?? null,
      partnerNickname: this.getPartnerNickname(conv, userId),
      lastMessage: conv.messages[0] ?? null,
      unreadCount: conv._count.messages,
    };
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

    return conversations.map((conv) =>
      this.buildConversationItem(conv, userId)
    );
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
      ...this.buildConversationItem(conv, userId),
      postStatus: conv.post.status ?? null,
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

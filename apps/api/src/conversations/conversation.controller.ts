import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ConversationsService } from "./conversation.service";
import { ConversationsGateway } from "./conversations.gateway";

@ApiTags("conversations")
@Controller("conversations")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationsGateway: ConversationsGateway
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "会話を作成する" })
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateConversationDto
  ) {
    return this.conversationsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "自分が参加する会話一覧を取得する" })
  findAll(@Request() req: { user: { userId: string } }) {
    return this.conversationsService.findAllForUser(req.user.userId);
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "メッセージを送信する" })
  async createMessage(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: CreateMessageDto
  ) {
    const message = await this.conversationsService.createMessage(
      req.user.userId,
      id,
      dto
    );
    this.conversationsGateway.broadcastMessage(id, message);
    return message;
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "メッセージ一覧を取得する" })
  findMessages(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string
  ) {
    return this.conversationsService.findMessages(req.user.userId, id);
  }

  @Patch(":id/messages/read")
  @HttpCode(200)
  @ApiOperation({ summary: "会話内の未読メッセージを既読にする" })
  markAsRead(
    @Request() req: { user: { userId: string } },
    @Param("id") id: string
  ) {
    return this.conversationsService.markAsRead(req.user.userId, id);
  }
}

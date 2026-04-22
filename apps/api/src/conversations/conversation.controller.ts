import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  OPENAPI_CONVERSATION_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../common/openapi-examples";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ConversationResponseDto } from "./dto/conversation-response.dto";
import { MessageResponseDto } from "./dto/message-response.dto";
import { ConversationsService } from "./conversation.service";
import { ConversationsGateway } from "./conversations.gateway";

type AuthenticatedRequest = {
  user?: {
    id?: string;
    userId?: string;
  };
};

@ApiTags("conversations")
@Controller("conversations")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationsGateway: ConversationsGateway
  ) {}

  private getAuthenticatedUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException("認証ユーザー情報が不正です");
    }
    return userId;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "会話を作成する" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["postId", "sightingId"],
      example: {
        postId: OPENAPI_POST_ID_EXAMPLE,
        sightingId: OPENAPI_SIGHTING_ID_EXAMPLE,
      },
      properties: {
        postId: { type: "string", example: OPENAPI_POST_ID_EXAMPLE },
        sightingId: { type: "string", example: OPENAPI_SIGHTING_ID_EXAMPLE },
      },
    },
  })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto
  ) {
    return this.conversationsService.create(
      this.getAuthenticatedUserId(req),
      dto
    );
  }
  @Get()
  @ApiOperation({ summary: "自分が参加する会話一覧を取得する" })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.conversationsService.findAllForUser(
      this.getAuthenticatedUserId(req)
    );
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "メッセージを送信する" })
  @ApiParam({ name: "id", example: OPENAPI_CONVERSATION_ID_EXAMPLE })
  @ApiBody({
    schema: {
      type: "object",
      required: ["body"],
      example: {
        body: "こんにちは、見つかりましたか？",
      },
      properties: {
        body: { type: "string", maxLength: 1000, example: "こんにちは、見つかりましたか？" },
      },
    },
  })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async createMessage(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateMessageDto
  ) {
    const message = await this.conversationsService.createMessage(
      this.getAuthenticatedUserId(req),
      id,
      dto
    );
    this.conversationsGateway.broadcastMessage(id, message);
    return message;
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "メッセージ一覧を取得する" })
  @ApiParam({ name: "id", example: OPENAPI_CONVERSATION_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  findMessages(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.conversationsService.findMessages(
      this.getAuthenticatedUserId(req),
      id
    );
  }

  @Patch(":id/messages/read")
  @HttpCode(200)
  @ApiOperation({ summary: "会話内の未読メッセージを既読にする" })
  @ApiParam({ name: "id", example: OPENAPI_CONVERSATION_ID_EXAMPLE })
  markAsRead(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.conversationsService.markAsRead(
      this.getAuthenticatedUserId(req),
      id
    );
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SkipThrottle } from "@nestjs/throttler";
import {
  OPENAPI_CONVERSATION_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../common/openapi-examples";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import {
  ConversationResponseDto,
  ConversationListItemDto,
} from "./dto/conversation-response.dto";
import { MessageResponseDto } from "./dto/message-response.dto";
import { ConversationsService } from "./conversation.service";
import { ConversationsGateway } from "./conversations.gateway";
import { ConversationFileStorageService } from "./conversation-file-storage.service";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { ERROR_CODES } from "../common/error-codes";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB（sharp で圧縮するため生ファイルは大きくても許容）

@ApiTags("conversations")
@Controller("conversations")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@SkipThrottle({ default: true, public: true })
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly conversationsGateway: ConversationsGateway,
    private readonly conversationFileStorage: ConversationFileStorageService
  ) {}

  private getAuthenticatedUserId(req: AuthenticatedRequest): string {
    return req.user.id;
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
  @ApiResponse({ status: 200, type: [ConversationListItemDto] })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.conversationsService.findAllForUser(
      this.getAuthenticatedUserId(req)
    );
  }

  @Get("unread-count")
  @SkipThrottle({ default: true, public: true })
  @ApiOperation({ summary: "未読メッセージの合計数を取得する" })
  @ApiResponse({
    status: 200,
    schema: {
      properties: { count: { type: "number", example: 3 } },
    },
  })
  getUnreadCount(@Request() req: AuthenticatedRequest) {
    return this.conversationsService.getUnreadCount(
      this.getAuthenticatedUserId(req)
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "会話を取得する" })
  @ApiParam({ name: "id", example: OPENAPI_CONVERSATION_ID_EXAMPLE })
  @ApiResponse({ status: 200, type: ConversationListItemDto })
  findOne(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.conversationsService.findOneForUser(
      this.getAuthenticatedUserId(req),
      id
    );
  }

  @Post(":id/messages")
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "メッセージを送信する（テキストまたは画像）" })
  @ApiParam({ name: "id", example: OPENAPI_CONVERSATION_ID_EXAMPLE })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        body: {
          type: "string",
          maxLength: 1000,
          example: "こんにちは、見つかりましたか？",
        },
        image: {
          type: "string",
          format: "binary",
          description: "JPEG/PNG、2MB以下",
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  async createMessage(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateMessageDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException({
          code: ERROR_CODES.FILE_UNSUPPORTED_TYPE,
          message: `未対応のファイル形式です: ${file.mimetype}。JPEG、PNG、GIF、WebP を使用してください。`,
        });
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException({
          code: ERROR_CODES.FILE_SIZE_EXCEEDED,
          message: "ファイルサイズは20MB以内にしてください",
        });
      }
      const savedUrl = await this.conversationFileStorage.saveFile(id, file);
      dto = { ...dto, imageUrl: `/${savedUrl}` };
    }

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

import {
  Body,
  Controller,
  Delete,
  Get,
  BadRequestException,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { OPENAPI_USER_ID_EXAMPLE } from "../common/openapi-examples";
import { RegisterDto } from "./dto/register.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { IIdentityService } from "../identity/identity.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly identity: IIdentityService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: "認証が必要です" })
  @ApiResponse({ status: 403, description: "管理者のみ" })
  async findAll() {
    return this.identity.findAll();
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiParam({ name: "id", example: OPENAPI_USER_ID_EXAMPLE })
  @ApiResponse({ status: 200, description: "ユーザー削除成功" })
  @ApiResponse({ status: 401, description: "認証が必要です" })
  @ApiResponse({ status: 403, description: "管理者のみ" })
  @ApiResponse({ status: 404, description: "ユーザーが見つかりません" })
  async remove(@Param("id") id: string) {
    return await this.identity.deleteUser(id);
  }

  @Post("register")
  @Throttle({ register: {} })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      anyOf: [{ required: ["nickname"] }, { required: ["name"] }],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 100,
          example: "password123",
        },
        nickname: {
          type: "string",
          minLength: 1,
          maxLength: 50,
          example: "Alice",
        },
        name: { type: "string", minLength: 1, maxLength: 50, example: "Alice" },
      },
      example: {
        email: "user@example.com",
        password: "password123",
        nickname: "Alice",
      },
    },
  })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async register(@Body() dto: RegisterDto) {
    const nickname = dto.nickname ?? dto.name;
    if (!nickname) {
      throw new BadRequestException({ error: "ニックネームは必須です" });
    }
    try {
      const user = await this.identity.register(
        dto.email,
        dto.password,
        nickname
      );
      return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        createdAt: user.createdAt,
      };
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(
        { error: "内部サーバーエラーが発生しました" },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { RegisterDto } from "./dto/register.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./user.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @ApiResponse({ status: 403, description: "管理者のみ" })
  async findAll() {
    return this.users.findAll();
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiResponse({ status: 200, description: "ユーザー削除成功" })
  @ApiResponse({ status: 403, description: "管理者のみ" })
  @ApiResponse({ status: 404, description: "ユーザーが見つかりません" })
  async remove(@Param("id") id: string) {
    try {
      return await this.users.deleteUser(id);
    } catch (e: any) {
      if (e?.code === "P2025") {
        throw new HttpException(
          { error: "ユーザーが見つかりません" },
          HttpStatus.NOT_FOUND
        );
      }
      throw e;
    }
  }

  @Post("register")
  @ApiResponse({ status: 201, type: UserResponseDto })
  async register(@Body() dto: RegisterDto) {
    try {
      const user = await this.users.createUser(
        dto.email,
        dto.password,
        dto.name
      );
      return { id: user.id, email: user.email, nickname: user.nickname };
    } catch (e: any) {
      // Handle unique constraint (Prisma P2002) as bad request
      if (e?.code === "P2002" || (e?.meta && /unique/i.test(String(e.meta)))) {
        throw new HttpException(
          { error: "このメールアドレスはすでに使用されています" },
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        { error: "内部サーバーエラーが発生しました" },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

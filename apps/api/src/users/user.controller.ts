import {
  Body,
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { UsersService } from "./user.service";
import { UserResponseDto } from "./dto/user-response.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  // TanStack Start との対比用エンドポイント
  // TanStack Start: モーダルから await getUsers() を呼ぶだけで完結
  // NestJS:  ① このルート定義 ② service.findAll() ③ フロントの useQuery の3段階が必要
  @Get()
  async findAll() {
    return this.users.findAll();
  }

  @Post("register")
  @ApiResponse({ status: 201, type: UserResponseDto })
  async register(@Body() dto: RegisterDto) {
    try {
      const user = await this.users.createUser(
        dto.email,
        dto.password,
        dto.nickname
      );
      return { id: user.id, email: user.email, nickname: user.nickname };
    } catch (e: any) {
      // Handle unique constraint (Prisma P2002) as bad request
      if (e?.code === "P2002" || (e?.meta && /unique/i.test(String(e.meta)))) {
        throw new HttpException(
          { error: "Email already exists" },
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        { error: "Internal server error" },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

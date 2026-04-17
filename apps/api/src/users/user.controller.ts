import {
  Body,
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiProperty, ApiTags, ApiResponse } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from "class-validator";
import { UsersService } from "./user.service";
import { UserResponseDto } from "./dto/user-response.dto";

class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ required: false, example: "Alice" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}

@ApiTags('users')
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
    console.log('Register request:', dto);
    try {
      const user = await this.users.createUser(
        dto.email,
        dto.password,
        dto.name,
      );
      return { id: user.id, email: user.email, name: user.name };
    } catch (e: any) {
      // Log the raw error for debugging in dev
      // eslint-disable-next-line no-console
      console.error("UsersController.register error:", e && (e.stack || e));
      // Handle unique constraint (Prisma P2002) as bad request
      if (e?.code === "P2002" || (e?.meta && /unique/i.test(String(e.meta)))) {
        throw new HttpException(
          { error: "Email already exists" },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        { error: "Internal server error" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

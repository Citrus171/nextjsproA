import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./user.service";

class RegisterDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty({ required: false })
  name?: string;
}

@ApiTags('users')
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Post("register")
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

import {
  Body,
  Controller,
  UnauthorizedException,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { IIdentityService } from "../identity/identity.service";
import { LoginDto } from "./dto/login.dto";
import {
  AccessTokenResponseDto,
  LogoutResponseDto,
} from "./dto/auth-response.dto";
import { Request, Response } from "express";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly identity: IIdentityService) {}

  @Post("login")
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.identity.login(dto.email, dto.password);
    this.applyCookies(res, result.setCookies);
    return { accessToken: result.accessToken };
  }

  @Post("refresh")
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = req.cookies?.refreshToken;
    if (!token)
      throw new UnauthorizedException({
        error: "リフレッシュトークンがありません",
      });
    const result = await this.identity.refresh(token);
    this.applyCookies(res, result.setCookies);
    return { accessToken: result.accessToken };
  }

  @Post("logout")
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) await this.identity.logout(token);
    res.clearCookie("refreshToken", { path: "/" });
    return { ok: true };
  }

  private applyCookies(
    res: Response,
    cookies: { name: string; value: string; options: Record<string, unknown> }[]
  ) {
    for (const c of cookies) {
      res.cookie(c.name, c.value, c.options);
    }
  }
}

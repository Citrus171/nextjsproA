import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiProperty, ApiTags, ApiResponse } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { AccessTokenResponseDto, LogoutResponseDto } from "./dto/auth-response.dto";

class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

@ApiTags('auth')
@Controller("auth")
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwt: JwtService,
  ) {}

  @Post("login")
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user)
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    const refresh = await this.auth.createRefreshToken(user.id);
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refresh, {
      httpOnly: true,
      secure: isProd,
      // In production we need SameSite=None and Secure to allow cross-site cookies over HTTPS
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
    return res.json({ accessToken: token });
  }

  @Post("refresh")
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });
    const rec = await this.auth.findRefreshToken(token);
    if (!rec) return res.status(401).json({ error: "Invalid refresh token" });
    const rot = await this.auth.rotateRefreshToken(token);
    if (!rot) return res.status(401).json({ error: "Invalid refresh token" });
    const accessToken = this.jwt.sign({ sub: rot.userId });
    const isProd2 = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", rot.newToken, {
      httpOnly: true,
      secure: isProd2,
      sameSite: isProd2 ? "none" : "lax",
      path: "/",
    });
    return res.json({ accessToken });
  }

  @Post("logout")
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) await this.auth.revokeRefreshToken(token);
    res.clearCookie("refreshToken", { path: "/" });
    return res.json({ ok: true });
  }
}

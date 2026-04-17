import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { AccessTokenResponseDto, LogoutResponseDto } from "./dto/auth-response.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { Request, Response } from "express";

@ApiTags("auth")
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
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);
    const refresh = await this.auth.createRefreshToken(user.id);
    this.setRefreshCookie(res, refresh);
    return res.json({ accessToken });
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
    const payload: JwtPayload = { sub: rot.userId, email: rot.email };
    const accessToken = this.jwt.sign(payload);
    this.setRefreshCookie(res, rot.newToken);
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

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
  }
}

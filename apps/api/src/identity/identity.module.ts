import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { IdentityService, IIdentityService } from "./identity.service";
import { CryptoService } from "./crypto.service";
import { JwtStrategy } from "../auth/jwt.strategy";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { AuthController } from "../auth/auth.controller";
import { UsersController } from "../users/user.controller";
import { PrismaService } from "../prisma.service";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    PrismaService,
    CryptoService,
    { provide: IIdentityService, useClass: IdentityService },
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [IIdentityService, JwtAuthGuard, RolesGuard],
})
export class IdentityModule {}

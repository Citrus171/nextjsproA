import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  canActivate(context: ExecutionContext) {
    console.log('AuthGuard called');
    const req = context.switchToHttp().getRequest();
    const auth = req.headers["authorization"] || req.headers["Authorization"];
    if (!auth) {
      console.log('No auth header');
      throw new UnauthorizedException("No authorization header");
    }
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.log('Invalid token format');
      throw new UnauthorizedException("Invalid token format");
    }
    const token = parts[1];
    try {
      const secret = process.env.JWT_SECRET || "dev-secret";
      const payload = jwt.verify(token, secret) as any;
      console.log('Auth success for user:', payload.sub);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch (err) {
      console.log('Auth error:', err.message);
      throw new UnauthorizedException("Invalid token");
    }
  }
}

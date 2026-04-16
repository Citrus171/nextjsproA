import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers["authorization"] || req.headers["Authorization"];
    if (!auth) throw new UnauthorizedException("No authorization header");
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      throw new UnauthorizedException("Invalid token format");
    const token = parts[1];
    try {
      const secret = process.env.JWT_SECRET || "dev-secret";
      const payload = jwt.verify(token, secret) as any;
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch (err) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

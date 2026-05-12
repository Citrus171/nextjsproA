import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "./roles.decorator";
import { ERROR_CODES } from "../common/error-codes";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { role: Role } }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({
        code: ERROR_CODES.AUTH_ADMIN_REQUIRED,
        message: "この操作には管理者権限が必要です",
      });
    }
    return true;
  }
}

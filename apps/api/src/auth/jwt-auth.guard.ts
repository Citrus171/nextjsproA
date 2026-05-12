import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override handleRequest<TUser = any>(err: any, user: any): TUser {
    return (user ?? null) as unknown as TUser;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

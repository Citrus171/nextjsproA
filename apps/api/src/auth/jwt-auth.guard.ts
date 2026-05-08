import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: any, user: any): TUser {
    return (user ?? null) as unknown as TUser;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

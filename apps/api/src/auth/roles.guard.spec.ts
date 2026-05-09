import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";

function makeContext(role: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: "u1", role } : undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("@Roles デコレータがない場合は通す", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    expect(guard.canActivate(makeContext("user"))).toBe(true);
  });

  it("ロールが一致する場合は通す", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    expect(guard.canActivate(makeContext("admin"))).toBe(true);
  });

  it("ロールが一致しない場合は ForbiddenException をスローする", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    try {
      guard.canActivate(makeContext("user"));
      fail("例外がスローされるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      const response = (e as ForbiddenException).getResponse();
      expect(response).toMatchObject({
        code: "E_AUTH_ADMIN_REQUIRED",
        message: expect.any(String),
      });
    }
  });

  it("ユーザーが未設定の場合は ForbiddenException をスローする", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
    try {
      guard.canActivate(makeContext(undefined));
      fail("例外がスローされるべき");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      const response = (e as ForbiddenException).getResponse();
      expect(response).toMatchObject({
        code: "E_AUTH_ADMIN_REQUIRED",
        message: expect.any(String),
      });
    }
  });
});

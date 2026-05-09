import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    _host: ArgumentsHost
  ): void {
    if (exception.code === "P2025") {
      throw new NotFoundException({
        code: "E_RESOURCE_NOT_FOUND",
        message: "リソースが見つかりません",
      });
    }
    if (exception.code === "P2002") {
      throw new ConflictException({
        code: "E_RESOURCE_DUPLICATE",
        message: "リソースが重複しています",
      });
    }
    throw exception;
  }
}

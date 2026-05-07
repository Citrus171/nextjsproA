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
      throw new NotFoundException({ error: "リソースが見つかりません" });
    }
    if (exception.code === "P2002") {
      throw new ConflictException({ error: "リソースが重複しています" });
    }
    throw exception;
  }
}

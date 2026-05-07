import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Catch()
export class PrismaClientExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost): void {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2025") {
        throw new NotFoundException({ error: "リソースが見つかりません" });
      }
      if (exception.code === "P2002") {
        throw new ConflictException({ error: "リソースが重複しています" });
      }
    }
    throw exception;
  }
}

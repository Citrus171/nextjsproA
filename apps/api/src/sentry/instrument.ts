import * as dotenv from "dotenv";
import * as Sentry from "@sentry/nestjs";
import { prismaIntegration } from "@sentry/node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

dotenv.config();

const dsn = process.env.SENTRY_DSN;

if (dsn && process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    integrations: [
      prismaIntegration({
        prismaInstrumentation: new PrismaInstrumentation(),
      }),
    ],
  });
}

import * as dotenv from "dotenv";
import * as Sentry from "@sentry/nestjs";

dotenv.config();

const dsn = process.env.SENTRY_DSN;

if (dsn && process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
  });
}

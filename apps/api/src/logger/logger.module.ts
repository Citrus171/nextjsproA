import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import type { Options } from "pino-http";
import { LoggerInterceptor } from "./logger.interceptor";

export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "res.headers.set-cookie",
];

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        redact: { paths: REDACT_PATHS, censor: "[Redacted]" },
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
      } as Options,
    }),
  ],
  providers: [LoggerInterceptor],
  exports: [LoggerInterceptor],
})
export class LoggerModule {}

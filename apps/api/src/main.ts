import "./sentry/instrument";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as path from "path";
import { Logger } from "nestjs-pino";
import { applyParameterExamples } from "./common/openapi-document";
import { isOriginAllowed } from "./common/cors";
import { assertSecrets } from "./common/startup-guard";

async function bootstrap() {
  assertSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");
  app.useStaticAssets(path.join(__dirname, "..", "uploads"), {
    prefix: "/uploads",
  });
  app.use(cookieParser());
  // Allow browser (Vite) origin to send cookies. Use env override or accept multiple dev ports.
  const isDev = process.env.NODE_ENV !== "production";
  const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
  const allowedOrigins = [
    webOrigin,
    "http://localhost:5174",
    "http://localhost:5175",
  ];
  app.enableCors({
    origin: (origin, cb) => {
      if (isOriginAllowed(origin, isDev, allowedOrigins)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  // Setup Swagger UI
  const config = new DocumentBuilder()
    .setTitle("API")
    .setDescription("API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  applyParameterExamples(document);
  if (process.env.NODE_ENV !== "production") {
    SwaggerModule.setup("api", app, document);
  }

  await app.listen(3000);
  app.get(Logger).log("API listening on http://localhost:3000");
}

void bootstrap();

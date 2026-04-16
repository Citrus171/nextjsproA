import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  // Allow browser (Vite) origin to send cookies. Use env override or accept multiple dev ports.
  const webOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";
  const additionalOrigins = ["http://localhost:5174", "http://localhost:5175"];
  const allowedOrigins = [webOrigin, ...additionalOrigins];
  app.enableCors({
    origin: (origin, cb) => {
      // allow requests with no origin (e.g. curl, mobile)
      if (!origin) return cb(null, true);
      // Allow configured origins
      if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
      // In development, allow any localhost origin (different Vite ports)
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });

  // Swagger/OpenAPI generation is done via the separate script `src/swagger.ts`.
  // Skip setting up Swagger UI during normal dev server to avoid runtime scanner issues.

  await app.listen(3000);
  console.log("API listening on http://localhost:3000");
}

bootstrap();

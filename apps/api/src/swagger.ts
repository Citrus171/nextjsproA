import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import { UsersModule } from "./users/user.module";
import { PostsModule } from "./posts/post.module";
import { AuthModule } from "./auth/auth.module";

async function dump() {
  const app = await NestFactory.create(AppModule);
  // Ensure app modules and routes are initialized before scanning
  app.setGlobalPrefix("api");
  await app.init();
  const config = new DocumentBuilder()
    .setTitle("API")
    .setVersion("1.0")
    .build();
  // No compatibility shim required with @nestjs/swagger v7+ and Nest v10

  const document = SwaggerModule.createDocument(app, config, {
    include: [UsersModule, PostsModule, AuthModule],
  });
  fs.writeFileSync("openapi.json", JSON.stringify(document, null, 2));
  console.log("openapi.json generated");
  await app.close();
}

dump();

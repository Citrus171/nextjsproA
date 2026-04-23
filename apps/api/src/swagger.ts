import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import { applyParameterExamples } from "./common/openapi-document";

async function dump() {
  const app = await NestFactory.create(AppModule);
  // Ensure app modules and routes are initialized before scanning
  app.setGlobalPrefix("api");
  await app.init();
  const config = new DocumentBuilder()
    .setTitle("API")
    .setDescription("API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  // No compatibility shim required with @nestjs/swagger v7+ and Nest v10

  const document = SwaggerModule.createDocument(app, config);
  applyParameterExamples(document);
  fs.writeFileSync(
    path.resolve(__dirname, "../../../packages/api-client/openapi.json"),
    JSON.stringify(document, null, 2)
  );
  console.log("openapi.json generated");
  await app.close();
}

dump();

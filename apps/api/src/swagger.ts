import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";

async function dump() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle("API")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync("openapi.json", JSON.stringify(document, null, 2));
  console.log("openapi.json generated");
  await app.close();
}

dump();

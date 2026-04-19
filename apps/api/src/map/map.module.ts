import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { MapController } from "./map.controller";
import { MapService } from "./map.service";

@Module({
  controllers: [MapController],
  providers: [MapService, PrismaService],
})
export class MapModule {}

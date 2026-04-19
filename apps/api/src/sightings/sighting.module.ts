import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { SightingsController } from "./sighting.controller";
import { SightingsService } from "./sighting.service";

@Module({
  controllers: [SightingsController],
  providers: [SightingsService, PrismaService],
})
export class SightingsModule {}

import { Module } from "@nestjs/common";
import { SightingsController } from "./sighting.controller";
import { SightingsService } from "./sighting.service";

@Module({
  controllers: [SightingsController],
  providers: [SightingsService],
})
export class SightingsModule {}

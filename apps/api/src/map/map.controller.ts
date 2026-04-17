import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MapService } from "./map.service";
import { MarkerDto } from "./dto/marker-response.dto";

@ApiTags("map")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("map")
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get("markers")
  @ApiResponse({ status: 200, type: MarkerDto, isArray: true })
  getMarkers(): MarkerDto[] {
    return this.mapService.getMarkers();
  }
}

import { Controller, Get, Query } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetMarkersQueryDto } from "./dto/get-markers-query.dto";
import { MapMarkerDto } from "./dto/marker-response.dto";
import { MapService } from "./map.service";

@ApiTags("map")
@Controller("map")
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get("markers")
  @ApiResponse({ status: 200, type: MapMarkerDto, isArray: true })
  getMarkers(@Query() query: GetMarkersQueryDto): Promise<MapMarkerDto[]> {
    return this.mapService.getMarkers(query);
  }
}

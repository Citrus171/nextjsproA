import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GetMarkersQueryDto } from "./dto/get-markers-query.dto";
import { MapMarkerDto } from "./dto/marker-response.dto";

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  async getMarkers(query: GetMarkersQueryDto): Promise<MapMarkerDto[]> {
    const { minLat, maxLat, minLng, maxLng, status } = query;

    const bboxFilter = (latField: string, lngField: string) => {
      const filter: Record<string, unknown> = {};
      if (minLat !== undefined)
        filter[latField] = {
          ...((filter[latField] as object) ?? {}),
          gte: minLat,
        };
      if (maxLat !== undefined)
        filter[latField] = {
          ...((filter[latField] as object) ?? {}),
          lte: maxLat,
        };
      if (minLng !== undefined)
        filter[lngField] = {
          ...((filter[lngField] as object) ?? {}),
          gte: minLng,
        };
      if (maxLng !== undefined)
        filter[lngField] = {
          ...((filter[lngField] as object) ?? {}),
          lte: maxLng,
        };
      return filter;
    };

    const postWhere: Record<string, unknown> = {
      location: { isNot: null, ...bboxFilter("lat", "lng") },
    };
    if (status) postWhere.status = status;

    const posts = await this.prisma.post.findMany({
      where: postWhere,
      select: {
        id: true,
        status: true,
        location: { select: { lat: true, lng: true } },
      },
    });

    const sightingWhere: Record<string, unknown> = {
      ...bboxFilter("lat", "lng"),
    };
    if (status) sightingWhere.post = { status };

    const sightings = await this.prisma.sighting.findMany({
      where: sightingWhere,
      select: {
        id: true,
        postId: true,
        lat: true,
        lng: true,
        post: { select: { status: true } },
      },
    });

    const postMarkers: MapMarkerDto[] = posts
      .filter((p) => p.location)
      .map((p) => ({
        type: "post",
        id: p.id,
        lat: p.location!.lat,
        lng: p.location!.lng,
        status: p.status,
      }));

    const sightingMarkers: MapMarkerDto[] = sightings.map((s) => ({
      type: "sighting",
      id: s.id,
      postId: s.postId,
      lat: s.lat,
      lng: s.lng,
      status: s.post.status,
    }));

    return [...postMarkers, ...sightingMarkers];
  }
}

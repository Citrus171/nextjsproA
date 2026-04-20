import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GetMarkersQueryDto } from "./dto/get-markers-query.dto";
import { MapMarkerDto } from "./dto/marker-response.dto";

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  async getMarkers(query: GetMarkersQueryDto): Promise<MapMarkerDto[]> {
    const { status } = query;
    const minLat = this.toOptionalNumber(query.minLat);
    const maxLat = this.toOptionalNumber(query.maxLat);
    const minLng = this.toOptionalNumber(query.minLng);
    const maxLng = this.toOptionalNumber(query.maxLng);

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

    const locationFilter = bboxFilter("lat", "lng");
    const hasLocationRangeFilter = Object.keys(locationFilter).length > 0;

    const postWhere: Record<string, unknown> = {
      location: hasLocationRangeFilter
        ? { is: locationFilter }
        : { isNot: null },
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

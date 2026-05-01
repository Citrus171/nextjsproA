import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GetMarkersQueryDto } from "./dto/get-markers-query.dto";
import { MapMarkerDto } from "./dto/marker-response.dto";

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number")
      return Number.isFinite(value) ? value : undefined;
    const str = String(value).trim();
    if (str === "") return undefined;
    const parsed = Number(str);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private setRangeFilter(
    filter: Record<string, unknown>,
    field: string,
    op: string,
    val: number | undefined
  ) {
    if (val === undefined) return;
    filter[field] = {
      ...((filter[field] as object) ?? {}),
      [op]: val,
    };
  }

  async getMarkers(query: GetMarkersQueryDto): Promise<MapMarkerDto[]> {
    const { status } = query;
    const minLat = this.toOptionalNumber(query.minLat);
    const maxLat = this.toOptionalNumber(query.maxLat);
    const minLng = this.toOptionalNumber(query.minLng);
    const maxLng = this.toOptionalNumber(query.maxLng);

    const bboxFilter = (latField: string, lngField: string) => {
      const filter: Record<string, unknown> = {};
      this.setRangeFilter(filter, latField, "gte", minLat);
      this.setRangeFilter(filter, latField, "lte", maxLat);
      this.setRangeFilter(filter, lngField, "gte", minLng);
      this.setRangeFilter(filter, lngField, "lte", maxLng);
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
        userId: true,
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
      postId: s.postId ?? undefined,
      userId: s.userId,
      lat: s.lat,
      lng: s.lng,
      status: s.post?.status ?? "lost",
    }));

    return [...postMarkers, ...sightingMarkers];
  }
}

import { ApiProperty } from "@nestjs/swagger";

export type MarkerType = "post" | "sighting";

export class MapMarkerDto {
  @ApiProperty({ enum: ["post", "sighting"] }) type: MarkerType;
  @ApiProperty() id: string;
  @ApiProperty({ required: false }) postId?: string;
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
  @ApiProperty({ enum: ["lost", "resolved"] }) status: "lost" | "resolved";
}

/** @deprecated 後方互換のためのエイリアス */
export class MarkerDto extends MapMarkerDto {}

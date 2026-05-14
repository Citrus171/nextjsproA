import { ApiProperty } from "@nestjs/swagger";
import {
  OPENAPI_SIGHTING_ID_EXAMPLE,
  OPENAPI_USER_ID_EXAMPLE,
  OPENAPI_POST_ID_EXAMPLE,
} from "../../common/openapi-examples";

export class SightingResponseDto {
  @ApiProperty({ example: OPENAPI_SIGHTING_ID_EXAMPLE })
  id: string;

  @ApiProperty({
    example: OPENAPI_POST_ID_EXAMPLE,
    required: false,
    nullable: true,
    type: String,
  })
  postId: string | null;

  @ApiProperty({ example: OPENAPI_USER_ID_EXAMPLE })
  userId: string;

  @ApiProperty({ example: 35.8617 })
  lat: number;

  @ApiProperty({ example: 139.6455 })
  lng: number;

  @ApiProperty({
    example: "埼玉県さいたま市浦和区",
    required: false,
    nullable: true,
    type: String,
  })
  address: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2024-01-02T00:00:00.000Z",
  })
  sightedAt: string;

  @ApiProperty({
    example: "公園付近で目撃しました",
    required: false,
    nullable: true,
    type: String,
  })
  comment: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2024-01-02T00:00:00.000Z",
  })
  createdAt: string;

  @ApiProperty({ example: "報告者ニックネーム", required: false })
  nickname?: string;
}

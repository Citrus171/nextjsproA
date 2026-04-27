import { ApiProperty } from "@nestjs/swagger";
import {
  OPENAPI_SIGHTING_ID_EXAMPLE,
  OPENAPI_USER_ID_EXAMPLE,
} from "../../common/openapi-examples";

export class SightingResponseDto {
  @ApiProperty({ example: OPENAPI_SIGHTING_ID_EXAMPLE })
  id: string;

  @ApiProperty({ example: OPENAPI_USER_ID_EXAMPLE })
  userId: string;

  @ApiProperty({
    example: "埼玉県さいたま市浦和区",
    required: false,
    nullable: true,
  })
  address: string | null;

  @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
  sightedAt: Date;

  @ApiProperty({
    example: "公園付近で目撃しました",
    required: false,
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
  createdAt: Date;
}

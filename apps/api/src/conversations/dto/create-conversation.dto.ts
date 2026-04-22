import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import {
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../../common/openapi-examples";

export class CreateConversationDto {
  @ApiProperty({ example: OPENAPI_POST_ID_EXAMPLE })
  @IsString()
  postId: string;

  @ApiProperty({ example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @IsString()
  sightingId: string;
}

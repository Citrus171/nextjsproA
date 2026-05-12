import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import {
  OPENAPI_POST_ID_EXAMPLE,
  OPENAPI_SIGHTING_ID_EXAMPLE,
} from "../../common/openapi-examples";

export class CreateConversationDto {
  @ApiProperty({ example: OPENAPI_POST_ID_EXAMPLE })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ example: OPENAPI_SIGHTING_ID_EXAMPLE })
  @IsString()
  @IsNotEmpty()
  sightingId: string;
}

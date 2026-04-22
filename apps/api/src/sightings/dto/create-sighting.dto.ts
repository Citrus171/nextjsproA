import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { OPENAPI_POST_ID_EXAMPLE } from "../../common/openapi-examples";

export class CreateSightingDto {
  @ApiProperty({ required: false, example: OPENAPI_POST_ID_EXAMPLE })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postId?: string;
  @ApiProperty({ example: 35.8617 }) @IsNumber() lat: number;
  @ApiProperty({ example: 139.6455 }) @IsNumber() lng: number;
  @ApiProperty({ required: false, example: "Saitama City, Urawa-ku" })
  @IsOptional()
  @IsString()
  address?: string;
  @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
  @IsDateString()
  sightedAt: string;
  @ApiProperty({ required: false, example: "Seed sighting" })
  @IsOptional()
  @IsString()
  comment?: string;
}

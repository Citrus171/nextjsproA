import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { OPENAPI_POST_ID_EXAMPLE } from "../../common/openapi-examples";

export class CreateSightingDto {
  @ApiProperty({ required: false, example: OPENAPI_POST_ID_EXAMPLE })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postId?: string;
  @ApiProperty({ example: 35.8617 }) @IsNumber() @Min(-90) @Max(90) lat: number;
  @ApiProperty({ example: 139.6455 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
  @ApiProperty({ required: false, example: "Saitama City, Urawa-ku" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;
  @ApiProperty({ example: "2024-01-02T00:00:00.000Z" })
  @IsDateString()
  sightedAt: string;
  @ApiProperty({ required: false, example: "Seed sighting" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  comment?: string;
}

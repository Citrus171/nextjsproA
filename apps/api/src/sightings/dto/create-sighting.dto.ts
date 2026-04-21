import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateSightingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  postId?: string;
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty() @IsDateString() sightedAt: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() comment?: string;
}

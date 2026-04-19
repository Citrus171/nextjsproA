import { ApiProperty } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { parseJsonField } from "../../utils/transform";

export class CreatePetDetailDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() color: string;
  @ApiProperty() @IsString() age: string;
  @ApiProperty() @IsString() features: string;
  @ApiProperty({ required: false, enum: ["male", "female", "unknown"] })
  @IsOptional()
  @IsEnum(["male", "female", "unknown"])
  gender?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() breed?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() size?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() collar?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  microchip?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  neutered?: boolean;
}

export class CreateLocationDto {
  @ApiProperty({ enum: ["saitama"] }) @IsEnum(["saitama"]) prefecture: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
}

export class CreatePostDto {
  @ApiProperty({ required: false, example: "白猫のミケを探しています" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: "首輪なし、人懐こい性格" })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ required: false, example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  lostDate?: string;

  @ApiProperty({ required: false, type: CreatePetDetailDto })
  @IsOptional()
  @Transform(parseJsonField)
  @ValidateNested()
  @Type(() => CreatePetDetailDto)
  petDetail?: CreatePetDetailDto;

  @ApiProperty({ required: false, type: CreateLocationDto })
  @IsOptional()
  @Transform(parseJsonField)
  @ValidateNested()
  @Type(() => CreateLocationDto)
  location?: CreateLocationDto;
}

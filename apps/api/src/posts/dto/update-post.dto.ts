import { ApiProperty } from "@nestjs/swagger";
import { Type, Transform, plainToInstance } from "class-transformer";
import { PostType } from "@prisma/client";
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
  ValidateIf,
  Max,
  Min,
} from "class-validator";

export class UpdatePetDetailDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() age?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() features?: string;
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

export class UpdateLocationDto {
  @ApiProperty({ required: false, enum: ["saitama"] })
  @IsOptional()
  @IsEnum(["saitama"])
  prefecture?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class UpdatePostDto {
  @ApiProperty({ required: false, enum: PostType, default: PostType.cat })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(PostType)
  postType?: PostType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiProperty({ required: false, example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  lostDate?: string;

  @ApiProperty({ required: false, enum: ["lost", "resolved"] })
  @IsOptional()
  @IsEnum(["lost", "resolved"])
  status?: string;

  @ApiProperty({ required: false, type: UpdatePetDetailDto })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed =
      typeof value === "string"
        ? (() => {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          })()
        : value;
    return parsed && typeof parsed === "object"
      ? plainToInstance(UpdatePetDetailDto, parsed)
      : parsed;
  })
  @ValidateNested()
  @Type(() => UpdatePetDetailDto)
  petDetail?: UpdatePetDetailDto;

  @ApiProperty({ required: false, type: UpdateLocationDto })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed =
      typeof value === "string"
        ? (() => {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          })()
        : value;
    return parsed && typeof parsed === "object"
      ? plainToInstance(UpdateLocationDto, parsed)
      : parsed;
  })
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;
}

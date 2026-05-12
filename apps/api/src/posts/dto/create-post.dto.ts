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
  Max,
  Min,
} from "class-validator";

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
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) lat: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) lng: number;
}

export class CreatePostDto {
  @ApiProperty({ required: false, enum: PostType, default: PostType.cat })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiProperty({ required: false, example: "白猫のミケを探しています" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ example: "首輪なし、人懐こい性格" })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ example: "2024-01-01" })
  @IsDateString()
  lostDate: string;

  @ApiProperty({ required: false, type: CreatePetDetailDto })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const parsed: unknown =
      typeof value === "string"
        ? (() => {
            try {
              return JSON.parse(value) as unknown;
            } catch {
              return value;
            }
          })()
        : value;
    return parsed && typeof parsed === "object"
      ? plainToInstance(CreatePetDetailDto, parsed)
      : parsed;
  })
  @ValidateNested()
  @Type(() => CreatePetDetailDto)
  petDetail?: CreatePetDetailDto;

  @ApiProperty({ required: false, type: CreateLocationDto })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const parsed: unknown =
      typeof value === "string"
        ? (() => {
            try {
              return JSON.parse(value) as unknown;
            } catch {
              return value;
            }
          })()
        : value;
    return parsed && typeof parsed === "object"
      ? plainToInstance(CreateLocationDto, parsed)
      : parsed;
  })
  @ValidateNested()
  @Type(() => CreateLocationDto)
  location?: CreateLocationDto;
}

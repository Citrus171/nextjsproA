import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsOptional } from "class-validator";

export class CreatePostDto {
  @ApiProperty({ example: "My first post" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: "Hello world!" })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;
}

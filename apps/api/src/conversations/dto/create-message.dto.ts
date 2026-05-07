import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    maxLength: 1000,
    example: "こんにちは、見つかりましたか？",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: "/uploads/conversations/conv-1/uuid.jpg",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

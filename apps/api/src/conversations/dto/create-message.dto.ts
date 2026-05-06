import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, ValidateIf } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    maxLength: 1000,
    example: "こんにちは、見つかりましたか？",
    required: false,
    nullable: true,
  })
  @ValidateIf((o) => !o.imageUrl)
  @IsString()
  @MaxLength(1000)
  body?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: "/uploads/conversations/conv-1/uuid.jpg",
  })
  @ValidateIf((o) => !o.body)
  @IsString()
  imageUrl?: string | null;
}

import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
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

  // imageUrl はサーバーが設定する内部値のためユーザー入力から除外
  @Exclude()
  declare readonly imageUrl?: never;
}

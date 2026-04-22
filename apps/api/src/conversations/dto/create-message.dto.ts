import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({ maxLength: 1000, example: "こんにちは、見つかりましたか？" })
  @IsString()
  @MaxLength(1000)
  body: string;
}

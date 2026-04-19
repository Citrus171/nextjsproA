import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  body: string;
}

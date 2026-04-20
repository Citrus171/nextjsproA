import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  postId: string;

  @ApiProperty()
  @IsString()
  sightingId: string;
}

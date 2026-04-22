import { ApiProperty } from "@nestjs/swagger";

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  sightingId: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  sighterId: string;

  @ApiProperty()
  createdAt: Date;
}

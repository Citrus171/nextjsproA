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

export class LastMessageDto {
  @ApiProperty()
  body: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationListItemDto {
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

  @ApiProperty({ nullable: true, type: String })
  postTitle: string | null;

  @ApiProperty({ nullable: true, type: String })
  postStatus: string | null;

  @ApiProperty()
  partnerNickname: string;

  @ApiProperty({ nullable: true, type: LastMessageDto })
  lastMessage: LastMessageDto | null;

  @ApiProperty()
  unreadCount: number;
}

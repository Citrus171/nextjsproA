import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ nullable: true, type: String })
  body: string | null;

  @ApiProperty({ nullable: true, type: String })
  imageUrl: string | null;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

import { ApiProperty } from "@nestjs/swagger";

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false, nullable: true })
  image: string | null;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  createdAt: Date;
}

export class PostListResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  items: PostResponseDto[];

  @ApiProperty()
  total: number;
}

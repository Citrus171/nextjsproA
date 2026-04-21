import { ApiProperty } from "@nestjs/swagger";
import { PostType } from "@prisma/client";

export class ImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() postId: string;
  @ApiProperty() url: string;
  @ApiProperty() createdAt: Date;
}

export class PetDetailResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() color: string;
  @ApiProperty() age: string;
  @ApiProperty() features: string;
  @ApiProperty({ required: false, nullable: true }) gender: string | null;
  @ApiProperty({ required: false, nullable: true }) breed: string | null;
  @ApiProperty({ required: false, nullable: true }) size: string | null;
  @ApiProperty({ required: false, nullable: true }) collar: string | null;
  @ApiProperty({ required: false, nullable: true }) microchip: boolean | null;
  @ApiProperty({ required: false, nullable: true }) neutered: boolean | null;
}

export class LocationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() prefecture: string;
  @ApiProperty() city: string;
  @ApiProperty() address: string;
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
}

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PostType })
  postType: PostType;

  @ApiProperty({ required: false, nullable: true })
  title: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  lostDate: Date;

  @ApiProperty({ required: false, nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({ required: false, nullable: true, type: PetDetailResponseDto })
  petDetail: PetDetailResponseDto | null;

  @ApiProperty({ required: false, nullable: true, type: LocationResponseDto })
  location: LocationResponseDto | null;

  @ApiProperty({ type: [ImageResponseDto] })
  images: ImageResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PostListResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  items: PostResponseDto[];

  @ApiProperty()
  total: number;
}

export class AddImagesResponseDto {
  @ApiProperty()
  remainingSlots: number;

  @ApiProperty({ type: [ImageResponseDto] })
  images: ImageResponseDto[];
}

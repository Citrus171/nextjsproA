import { ApiProperty } from "@nestjs/swagger";

export class MarkerDto {
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty({ required: false }) imageUrl?: string;
}

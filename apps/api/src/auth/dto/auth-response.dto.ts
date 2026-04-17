import { ApiProperty } from "@nestjs/swagger";

export class AccessTokenResponseDto {
  @ApiProperty()
  accessToken: string;
}

export class LogoutResponseDto {
  @ApiProperty()
  ok: boolean;
}

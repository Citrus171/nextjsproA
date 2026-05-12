import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "seed-owner@finder.miyaoo.test" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Password123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}

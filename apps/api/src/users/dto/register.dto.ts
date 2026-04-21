import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: "Alice", minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

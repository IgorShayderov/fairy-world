import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Use env variables with fallback defaults
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH ?? '15', 10);
const PASSWORD_MAX_LENGTH = parseInt(process.env.PASSWORD_MAX_LENGTH ?? '30', 10);

export class RegisterDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail({}, { message: 'email must be an email' })
  email!: string;

  @ApiProperty({ description: 'User password', example: 'Qwerty12345!Aa' })
  @IsString({ message: 'password must be a string' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: `password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: `password must be at most ${PASSWORD_MAX_LENGTH} characters` })
  @Matches(/[0-9]/, { message: 'password must contain at least 1 digit' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, { message: 'password must contain at least 1 symbol' })
  @Matches(/[a-z]/, { message: 'password must contain at least 1 latin character in lower register' })
  @Matches(/[A-Z]/, { message: 'password must contain at least 1 latin character in upper register' })
  @Matches(/(.)\1{3}/, { message: 'no character may repeat more than 3 times consecutively', each: true })
  password!: string;
}
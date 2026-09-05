import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email пользователя', example: 'user@example.com' })
  @IsEmail({}, { message: 'email must be an email' })
  email!: string;

  @ApiProperty({ description: 'Пароль пользователя', example: 'Qwerty12345!Aa' })
  @IsString({ message: 'password must be a string' })
  @MinLength(15, { message: 'password must be at least 15 characters' })
  @MaxLength(30, { message: 'password must be at most 30 characters' })
  @Matches(/[0-9]/, { message: 'password must contain at least 1 digit' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, { message: 'password must contain at least 1 symbol' })
  @Matches(/[a-z]/, { message: 'password must contain at least 1 latin character in lower register' })
  @Matches(/[A-Z]/, { message: 'password must contain at least 1 latin character in upper register' })
  @Matches(/(.)\1{3}/, { message: 'no character may repeat more than 3 times consecutively', each: true })
  password!: string;
}
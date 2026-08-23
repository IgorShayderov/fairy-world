import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email пользователя',
    example: 'example@gmail.com',
  })
  @IsEmail({}, { message: 'email must be an email' })
  email: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'Qwerty123',
  })
  @IsString({ message: 'password must be a string' })
  password: string;
}

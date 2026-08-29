import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty({ message: 'Токен обязателен' })
  token!: string;

  @ApiProperty({ example: 'new_secure_password_123' })
  @IsString()
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  password!: string;
}

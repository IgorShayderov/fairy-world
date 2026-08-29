import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for password reset request.
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * DTO for password reset.
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', example: 'newSecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/.*[A-Za-z].*/, { message: 'Password must contain at least one letter' })
  @Matches(/.*[0-9].*/, { message: 'Password must contain at least one digit' })
  password: string;
}

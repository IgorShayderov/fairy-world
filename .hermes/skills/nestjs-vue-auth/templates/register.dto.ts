import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Alice', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'alice@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/.*[A-Za-z].*/, { message: 'Password must contain at least one letter' })
  @Matches(/.*[0-9].*/, { message: 'Password must contain at least one digit' })
  password: string;

  @ApiProperty({ required: false, enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, example: 'en-US' })
  @IsOptional()
  @IsString()
  language?: string;
}
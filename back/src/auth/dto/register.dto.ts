import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Gender enum for user profile.
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/**
 * DTO for user registration request.
 */
export class RegisterDto {
  @ApiProperty({ description: 'User display name', example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: 'User email address', example: 'alice@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Password (min 6 chars)', example: 'securePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/.*[A-Za-z].*/, { message: 'Password must contain at least one letter' })
  @Matches(/.*[0-9].*/, { message: 'Password must contain at least one digit' })
  password!: string;

  @ApiProperty({ enum: Gender, required: false, description: 'Gender (MALE, FEMALE, OTHER)' })
  @IsOptional()
  @IsIn(Object.values(Gender))
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Country name', example: 'Russia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ required: false, description: 'City name', example: 'Moscow' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    description: 'Preferred language code',
    example: 'en',
    pattern: '^[a-z]{2}(-[A-Z]{2})?$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'Language must be a valid code like "en" or "en-US"' })
  language?: string;
}

/**
 * Response type for user registration.
 */
export interface RegisterResponse {
  access_token: string;
  expiresIn: number;
  user: {
    id: number;
    name: string;
    email: string;
    gender?: string | null;
    country?: string | null;
    city?: string | null;
    language?: string | null;
  };
}

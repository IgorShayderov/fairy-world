import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { FeedbackCategory, FeedbackStatus } from '../../generated/client';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class FeedbackDto {
  @IsUUID()
  requestId: string;

  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}

export class ReplyDto {
  @IsUUID()
  requestId: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;
}

export class FeedbackQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;
}

export class FeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;
}

export class AdminLoginDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

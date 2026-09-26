import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim() : value);
const trimUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateClanDto {
  @Transform(trim)
  @IsString()
  @Length(3, 24)
  @Matches(/^[\p{L}\p{N}][-\p{L}\p{N} ']{1,22}[\p{L}\p{N}]$/u, {
    message: 'Clan name may contain letters, numbers, spaces, apostrophes and hyphens',
  })
  name!: string;

  @Transform(trimUppercase)
  @IsString()
  @Length(2, 5)
  @Matches(/^[A-Z0-9]+$/, { message: 'Clan tag may contain only Latin letters and numbers' })
  tag!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(160)
  description!: string;
}

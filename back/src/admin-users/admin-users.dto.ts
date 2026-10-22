import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttributeType } from '../../generated/client';
import { RegisterDto } from '../auth/dto/register.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class AdminUsersQueryDto {
  @IsOptional() @IsString() @MaxLength(100) @Transform(trim) q?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
}
export class CreateAdminUserDto extends RegisterDto {
  @IsString() @Length(2, 60) @Transform(trim) name: string;
  @IsString() @Length(3, 500) @Transform(trim) reason: string;
}
export class AdminChangeDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedState: string;
  @IsString() @Length(3, 500) @Transform(trim) reason: string;
}
export class AdminAttributeDto {
  @IsEnum(AttributeType) name: AttributeType;
  @IsInt() @Min(0) @Max(1000000) value: number;
}
export class UpdateAdminUserDto extends AdminChangeDto {
  @IsString() @Length(2, 60) @Transform(trim) name: string;
  @IsEmail() @MaxLength(254) @Transform(trim) email: string;
  @IsInt() @Min(1) @Max(100) level: number;
  @IsInt() @Min(0) @Max(1000000000) experience: number;
  @IsInt() @Min(0) @Max(1000000000) gold: number;
  @IsInt() @Min(0) @Max(1000000000) gems: number;
  @IsInt() @Min(0) @Max(1000000000) coinsOfHonour: number;
  @IsInt() @Min(0) @Max(1000000) freeAttributes: number;
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ArrayUnique((entry: AdminAttributeDto) => entry.name)
  @ValidateNested({ each: true })
  @Type(() => AdminAttributeDto)
  attributes: AdminAttributeDto[];
}
export class GrantAdminItemDto extends AdminChangeDto {
  @IsInt() @Min(1) @Max(2147483647) itemId: number;
  @IsInt() @Min(1) @Max(9999) quantity: number;
}
export class UpdateAdminItemDto extends AdminChangeDto {
  @IsIn(['quantity', 'remove', 'unequip']) action: 'quantity' | 'remove' | 'unequip';
  @IsOptional() @IsInt() @Min(1) @Max(9999) quantity?: number;
}

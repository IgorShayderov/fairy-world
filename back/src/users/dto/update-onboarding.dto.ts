import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min, ValidateIf } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @Transform(({ obj }: { obj: { step?: unknown } }) => obj.step)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(5)
  step?: number;

  @ApiPropertyOptional()
  @Transform(({ obj }: { obj: { completed?: unknown } }) => obj.completed)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  completed?: boolean;
}

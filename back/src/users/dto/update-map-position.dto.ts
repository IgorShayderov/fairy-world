import { IsNumber, Max, Min } from 'class-validator';

export class UpdateMapPositionDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(3200)
  x!: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(2100)
  y!: number;
}

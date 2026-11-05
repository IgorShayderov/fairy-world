import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';
import { buildingKeys, unitKeys } from './castle-rules';

export class CastleSiteDto {
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(3200) x!: number;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(2100) y!: number;
}
export class CreateCastleDto extends CastleSiteDto {
  @IsString() @Length(3, 40) @Matches(/\S/) name!: string;
}
export class CastleBuildingDto {
  @IsIn(buildingKeys) building!: string;
}
export class CastleTrainingDto {
  @IsIn(unitKeys) unit!: string;
  @IsInt() @Min(1) @Max(100) count!: number;
}
export class CastleRaidDto {
  @IsString() @Length(1, 40) target!: string;
  @IsInt() @Min(0) @Max(200) sentinels!: number;
  @IsInt() @Min(0) @Max(200) rangers!: number;
  @IsInt() @Min(0) @Max(200) arcanists!: number;
}

import { IsInt, IsOptional, IsUUID, Max, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuctionDto {
  @IsUUID()
  requestId: string;

  @IsInt()
  @Min(1)
  inventoryItemId: number;

  @IsInt()
  @Min(1)
  @Max(99999)
  quantity: number;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  price: number;

  @IsInt()
  @Min(1)
  @Max(24)
  durationHours: number;
}

export class AuctionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @IsOptional()
  @IsIn(['market', 'mine'])
  view: 'market' | 'mine' = 'market';
}

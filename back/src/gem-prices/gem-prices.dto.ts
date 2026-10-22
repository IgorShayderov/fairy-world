import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { GEM_ACTIONS, type GemAction } from './gem-prices';

export class GemPriceDto {
  @IsIn(Object.keys(GEM_ACTIONS))
  key: GemAction;

  @IsInt()
  @Min(0)
  @Max(100000)
  cost: number;
}

export class GemPurchaseDto {
  // Older clients may omit this. Current clients send the displayed quote.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  expectedCost?: number;
}

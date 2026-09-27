import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class BuyPvpShopOfferDto {
  @ApiProperty({ description: 'Player-specific PvP shop offer ID' })
  @IsString()
  @Matches(/^(potion|upgrade):\d+$/)
  offerId!: string;
}

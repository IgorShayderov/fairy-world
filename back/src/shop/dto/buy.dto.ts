import { IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyDto {
  @ApiProperty({ description: 'ID предмета в магазине', example: 1 })
  @IsInt()
  @Min(1)
  itemId: number;

  @ApiProperty({ description: 'Количество', example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class SellDto {
  @ApiProperty({ description: 'Имя предмета', example: 'Медный меч' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Количество', example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellDto {
  @ApiProperty({ description: 'Item ID', example: 1 })
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ description: 'Количество', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

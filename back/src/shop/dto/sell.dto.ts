import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellDto {
  @ApiProperty({ description: 'Название предмета', example: 'Iron Sword' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Количество', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

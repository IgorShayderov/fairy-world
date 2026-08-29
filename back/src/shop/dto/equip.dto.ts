import { IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipDto {
  @ApiProperty({ description: 'ID записи в инвентаре пользователя', example: 1 })
  @IsInt()
  @Min(1)
  inventoryItemId!: number;

  @ApiProperty({ description: 'Надеть (true) или снять (false)', example: true })
  @IsBoolean()
  equipped!: boolean;
}

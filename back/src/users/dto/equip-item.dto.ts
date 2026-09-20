import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

export const EQUIPMENT_SLOTS = [
  'head',
  'body',
  'left-hand',
  'right-hand',
  'hands',
  'legs',
  'feet',
  'accessory',
  'amulet',
  'banner',
] as const;

export type EquipmentSlotId = (typeof EQUIPMENT_SLOTS)[number];

export class EquipItemDto {
  @ApiProperty({ description: 'Inventory entry ID', example: 12 })
  @IsInt()
  @Min(1)
  inventoryItemId!: number;

  @ApiProperty({ enum: EQUIPMENT_SLOTS, example: 'right-hand' })
  @IsIn(EQUIPMENT_SLOTS)
  slot!: EquipmentSlotId;
}

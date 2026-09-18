import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ReplaceInventoryItemDto {
  @ApiProperty({ description: 'Inventory item ID to be replaced and discarded', example: 10 })
  @IsInt()
  @Min(1)
  replaceInventoryItemId!: number;

  @ApiProperty({ description: 'New catalog item ID to be added to inventory', example: 42 })
  @IsInt()
  @Min(1)
  newItemId!: number;
}
